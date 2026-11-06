import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrescriptionAIStatus } from '@prisma/client';
import {
  RequestPrescriptionExtractionDto,
  RetryPrescriptionExtractionDto,
} from './prescription-ai.dto';
import {
  PrescriptionAIExtractionDTO,
  RequestPrescriptionExtractionResponseDTO,
} from '@pharmacy/shared-types';

export const PRESCRIPTION_AI_QUEUE = 'prescription-ai-extraction';

@Injectable()
export class PrescriptionAiService {
  private readonly logger = new Logger(PrescriptionAiService.name);
  private readonly providerName: string;
  private readonly modelName: string;
  private readonly maxRetries: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @InjectQueue(PRESCRIPTION_AI_QUEUE)
    private readonly extractionQueue: Queue,
  ) {
    this.providerName = this.configService.get<string>('prescriptionAi.provider', 'mock');
    this.modelName =
      this.providerName === 'gemini'
        ? this.configService.get<string>('prescriptionAi.geminiModel', 'gemini-2.5-flash')
        : 'mock-deterministic';
    this.maxRetries = this.configService.get<number>('prescriptionAi.maxRetries', 2);
  }

  async requestExtraction(
    customerUserId: string,
    prescriptionId: string,
    dto?: RequestPrescriptionExtractionDto,
  ): Promise<RequestPrescriptionExtractionResponseDTO> {
    await this.verifyPrescriptionOwnership(customerUserId, prescriptionId);

    // Prevent duplicate active processing requests
    const active = await this.prisma.prescriptionAIExtraction.findFirst({
      where: {
        prescriptionId,
        status: { in: [PrescriptionAIStatus.QUEUED, PrescriptionAIStatus.PROCESSING] },
      },
    });

    if (active) {
      throw new ConflictException({
        code: 'EXTRACTION_ALREADY_IN_PROGRESS',
        message: 'An AI extraction is already in progress for this prescription.',
      });
    }

    const previousCount = await this.prisma.prescriptionAIExtraction.count({
      where: { prescriptionId },
    });

    if (previousCount >= 5) {
      throw new BadRequestException({
        code: 'EXTRACTION_LIMIT_EXCEEDED',
        message: 'Maximum extraction attempt limit reached for this prescription.',
      });
    }

    const attemptNumber = previousCount + 1;

    const extraction = await this.prisma.prescriptionAIExtraction.create({
      data: {
        prescriptionId,
        status: PrescriptionAIStatus.QUEUED,
        provider: this.providerName,
        model: this.modelName,
        attemptNumber,
      },
    });

    await this.extractionQueue.add(
      'extract-prescription',
      {
        extractionId: extraction.id,
        prescriptionId,
        customerUserId,
        fixtureHint: dto?.mockFixture,
      },
      {
        attempts: this.maxRetries + 1,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'PRESCRIPTION_EXTRACTION_REQUESTED',
      resourceType: 'PrescriptionAIExtraction',
      resourceId: extraction.id,
      metadata: {
        prescriptionId,
        attemptNumber,
        provider: this.providerName,
      },
    });

    return {
      extractionId: extraction.id,
      prescriptionId,
      status: extraction.status as any,
      attemptNumber: extraction.attemptNumber,
      createdAt: extraction.createdAt.toISOString(),
    };
  }

  async getLatestExtraction(
    customerUserId: string,
    prescriptionId: string,
  ): Promise<PrescriptionAIExtractionDTO> {
    await this.verifyPrescriptionOwnership(customerUserId, prescriptionId);

    const latest = await this.prisma.prescriptionAIExtraction.findFirst({
      where: { prescriptionId },
      orderBy: { attemptNumber: 'desc' },
    });

    if (!latest) {
      throw new NotFoundException({
        code: 'EXTRACTION_NOT_FOUND',
        message: 'No extraction attempts found for this prescription.',
      });
    }

    return this.mapToDTO(latest);
  }

  async getExtractionById(
    customerUserId: string,
    prescriptionId: string,
    extractionId: string,
  ): Promise<PrescriptionAIExtractionDTO> {
    await this.verifyPrescriptionOwnership(customerUserId, prescriptionId);

    const extraction = await this.prisma.prescriptionAIExtraction.findFirst({
      where: {
        id: extractionId,
        prescriptionId,
      },
    });

    if (!extraction) {
      throw new NotFoundException({
        code: 'EXTRACTION_NOT_FOUND',
        message: 'Extraction record not found for this prescription.',
      });
    }

    return this.mapToDTO(extraction);
  }

  async retryExtraction(
    customerUserId: string,
    prescriptionId: string,
    extractionId: string,
    dto?: RetryPrescriptionExtractionDto,
  ): Promise<RequestPrescriptionExtractionResponseDTO> {
    await this.verifyPrescriptionOwnership(customerUserId, prescriptionId);

    const targetExtraction = await this.prisma.prescriptionAIExtraction.findFirst({
      where: {
        id: extractionId,
        prescriptionId,
      },
    });

    if (!targetExtraction) {
      throw new NotFoundException({
        code: 'EXTRACTION_NOT_FOUND',
        message: 'Extraction to retry not found.',
      });
    }

    // Only allow retry for failed or unreadable attempts
    if (
      targetExtraction.status !== PrescriptionAIStatus.FAILED &&
      targetExtraction.status !== PrescriptionAIStatus.NEEDS_REUPLOAD
    ) {
      throw new BadRequestException({
        code: 'INVALID_RETRY_STATE',
        message: 'Only failed or unreadable extractions may be retried.',
      });
    }

    // Check no active extraction currently in flight
    const active = await this.prisma.prescriptionAIExtraction.findFirst({
      where: {
        prescriptionId,
        status: { in: [PrescriptionAIStatus.QUEUED, PrescriptionAIStatus.PROCESSING] },
      },
    });

    if (active) {
      throw new ConflictException({
        code: 'EXTRACTION_ALREADY_IN_PROGRESS',
        message: 'An extraction is already actively processing for this prescription.',
      });
    }

    const previousCount = await this.prisma.prescriptionAIExtraction.count({
      where: { prescriptionId },
    });

    if (previousCount >= 5) {
      throw new BadRequestException({
        code: 'EXTRACTION_LIMIT_EXCEEDED',
        message: 'Maximum retry limit reached for this prescription.',
      });
    }

    const attemptNumber = previousCount + 1;

    const newExtraction = await this.prisma.prescriptionAIExtraction.create({
      data: {
        prescriptionId,
        status: PrescriptionAIStatus.QUEUED,
        provider: this.providerName,
        model: this.modelName,
        attemptNumber,
      },
    });

    await this.extractionQueue.add(
      'extract-prescription',
      {
        extractionId: newExtraction.id,
        prescriptionId,
        customerUserId,
        fixtureHint: dto?.mockFixture,
      },
      {
        attempts: this.maxRetries + 1,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'PRESCRIPTION_EXTRACTION_RETRY_REQUESTED',
      resourceType: 'PrescriptionAIExtraction',
      resourceId: newExtraction.id,
      metadata: {
        prescriptionId,
        previousAttemptId: targetExtraction.id,
        attemptNumber,
      },
    });

    return {
      extractionId: newExtraction.id,
      prescriptionId,
      status: newExtraction.status as any,
      attemptNumber: newExtraction.attemptNumber,
      createdAt: newExtraction.createdAt.toISOString(),
    };
  }

  private async verifyPrescriptionOwnership(customerUserId: string, prescriptionId: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        customerUserId,
      },
    });

    if (!rx) {
      throw new NotFoundException({
        code: 'PRESCRIPTION_NOT_FOUND',
        message: 'Prescription not found or does not belong to your account.',
      });
    }
  }

  private mapToDTO(record: any): PrescriptionAIExtractionDTO {
    return {
      id: record.id,
      prescriptionId: record.prescriptionId,
      status: record.status,
      provider: record.provider,
      model: record.model,
      attemptNumber: record.attemptNumber,
      documentReadable: record.documentReadable,
      overallConfidence: record.overallConfidence ? Number(record.overallConfidence) : null,
      extractionResult: record.extractionResult,
      matchingResult: record.matchingResult,
      errorCode: record.errorCode,
      errorMessage: record.errorMessage,
      startedAt: record.startedAt.toISOString(),
      completedAt: record.completedAt ? record.completedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
