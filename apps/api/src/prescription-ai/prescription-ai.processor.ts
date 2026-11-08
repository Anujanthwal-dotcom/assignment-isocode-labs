import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { MedicineMatchingService } from './matching/medicine-matching.service';
import { PRESCRIPTION_READER, PrescriptionReader } from './providers/prescription-reader.interface';
import { PrescriptionAIStatus } from '@prisma/client';
import { validatePrescriptionExtraction } from '@pharmacy/validation';
import { PDFDocument } from 'pdf-lib';
import { PRESCRIPTION_AI_QUEUE } from './prescription-ai.service';

export interface PrescriptionExtractionJobData {
  extractionId: string;
  prescriptionId: string;
  customerUserId: string;
  fixtureHint?: string;
}

@Processor(PRESCRIPTION_AI_QUEUE)
export class PrescriptionAiProcessor extends WorkerHost {
  private readonly logger = new Logger(PrescriptionAiProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly matchingService: MedicineMatchingService,
    @Inject(PRESCRIPTION_READER)
    private readonly reader: PrescriptionReader,
  ) {
    super();
  }

  async process(job: Job<PrescriptionExtractionJobData>): Promise<void> {
    const { extractionId, prescriptionId, customerUserId, fixtureHint } = job.data;
    this.logger.log(
      `Starting background extraction job ${job.id} for extraction ${extractionId} (attempt: ${job.attemptsMade + 1})`,
    );

    // 0. Ensure extraction record exists
    const existing = await this.prisma.prescriptionAIExtraction.findUnique({
      where: { id: extractionId },
    });
    if (!existing) {
      this.logger.warn(
        `Extraction record ${extractionId} no longer exists. Skipping job ${job.id}.`,
      );
      return;
    }

    // 1. Mark extraction as PROCESSING
    await this.prisma.prescriptionAIExtraction.update({
      where: { id: extractionId },
      data: {
        status: PrescriptionAIStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    try {
      // 2. Retrieve prescription record
      const prescription = await this.prisma.prescription.findFirst({
        where: {
          id: prescriptionId,
          customerUserId,
        },
      });

      if (!prescription) {
        throw new Error(`Prescription ${prescriptionId} not found or access denied.`);
      }

      // 3. Retrieve document buffer from private MinIO storage
      const buffer = await this.storageService.getPrescriptionBuffer(prescription.objectKey);
      if (!buffer || buffer.length === 0) {
        throw new Error('Prescription document buffer is empty or missing from storage.');
      }

      // 4. Validate PDF page limits
      if (prescription.mimeType === 'application/pdf') {
        const pdfDoc = await PDFDocument.load(buffer);
        const pageCount = pdfDoc.getPageCount();
        if (pageCount > 10) {
          throw new Error(
            `Prescription document exceeds the maximum 10-page limit (found ${pageCount} pages).`,
          );
        }
      }

      // 5. Query active medicines summary to provide catalogue context to AI
      const activeMedicines = await this.prisma.medicine.findMany({
        where: { status: 'ACTIVE' },
        select: { sku: true, name: true, brandName: true, genericName: true, strength: true, dosageForm: true, mrp: true },
        take: 100,
      });
      const catalogueMedicinesSummary = activeMedicines
        .map((m) => `${m.name} (${m.brandName || m.genericName || ''}) - ${m.strength || ''} [${m.sku}] MRP: ${m.mrp}`)
        .join('\n');

      // 6. Invoke configured AI Provider with catalogue awareness
      const extractionResult = await this.reader.extract({
        buffer,
        mimeType: prescription.mimeType,
        originalFileName: prescription.originalFileName,
        attemptNumber: job.attemptsMade + 1,
        fixtureHint,
        catalogueMedicinesSummary,
      });

      // 6. Validate extraction contract
      const validation = validatePrescriptionExtraction(extractionResult);
      if (!validation.valid || !validation.data) {
        throw new Error(`AI output failed schema validation: ${validation.errors.join('; ')}`);
      }

      // 7. Perform catalogue medicine matching
      const matchingResult = await this.matchingService.matchExtractedMedicines(
        validation.data.items,
      );

      // 8. Determine target completion status
      const targetStatus = validation.data.documentReadable
        ? PrescriptionAIStatus.COMPLETED
        : PrescriptionAIStatus.NEEDS_REUPLOAD;

      // 9. Persist completed extraction draft
      await this.prisma.prescriptionAIExtraction.update({
        where: { id: extractionId },
        data: {
          status: targetStatus,
          documentReadable: validation.data.documentReadable,
          overallConfidence: validation.data.overallConfidence,
          extractionResult: validation.data as any,
          matchingResult: matchingResult as any,
          completedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });

      // 10. Audit log (strictly no PHI in application logs)
      await this.auditService.record({
        actorUserId: customerUserId,
        action:
          targetStatus === PrescriptionAIStatus.COMPLETED
            ? 'PRESCRIPTION_EXTRACTION_COMPLETED'
            : 'PRESCRIPTION_EXTRACTION_NEEDS_REUPLOAD',
        resourceType: 'PrescriptionAIExtraction',
        resourceId: extractionId,
        metadata: {
          prescriptionId,
          status: targetStatus,
          itemCount: validation.data.items.length,
          documentReadable: validation.data.documentReadable,
        },
      });

      this.logger.log(
        `Prescription extraction ${extractionId} completed with status: ${targetStatus}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Error processing extraction ${extractionId} on attempt ${job.attemptsMade + 1}: ${err.message}`,
        err.stack,
      );

      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (isFinalAttempt) {
        // Mark extraction as FAILED with sanitized error message
        await this.prisma.prescriptionAIExtraction.update({
          where: { id: extractionId },
          data: {
            status: PrescriptionAIStatus.FAILED,
            errorCode: 'EXTRACTION_PROCESSING_ERROR',
            errorMessage:
              'The system encountered an error reading your prescription. You may retry or re-upload a clearer document.',
            completedAt: new Date(),
          },
        });

        await this.auditService.record({
          actorUserId: customerUserId,
          action: 'PRESCRIPTION_EXTRACTION_FAILED',
          resourceType: 'PrescriptionAIExtraction',
          resourceId: extractionId,
          metadata: {
            prescriptionId,
            attemptsMade: job.attemptsMade + 1,
          },
        });
      }

      throw err; // Re-throw to let BullMQ manage retry backoff
    }
  }
}
