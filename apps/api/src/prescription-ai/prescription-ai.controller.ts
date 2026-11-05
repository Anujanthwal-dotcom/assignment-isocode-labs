import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PrescriptionAiService } from './prescription-ai.service';
import {
  RequestPrescriptionExtractionDto,
  RetryPrescriptionExtractionDto,
} from './prescription-ai.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Prescription AI Extraction')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('prescriptions')
export class PrescriptionAiController {
  constructor(private readonly prescriptionAiService: PrescriptionAiService) {}

  @Post(':prescriptionId/extractions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request AI extraction for an uploaded prescription',
    description:
      'Initiates asynchronous background AI reading of the prescription. Returns 202 Accepted with extraction attempt details.',
  })
  @ApiParam({ name: 'prescriptionId', description: 'UUID of the prescription document' })
  @ApiResponse({ status: 202, description: 'Extraction request queued for processing' })
  @ApiResponse({ status: 400, description: 'Attempt limit reached or invalid request' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  @ApiResponse({ status: 409, description: 'Extraction is already active in progress' })
  async requestExtraction(
    @CurrentUser('id') customerUserId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: RequestPrescriptionExtractionDto,
  ) {
    return this.prescriptionAiService.requestExtraction(
      customerUserId,
      prescriptionId,
      dto,
    );
  }

  @Get(':prescriptionId/extractions/latest')
  @ApiOperation({
    summary: 'Get latest extraction status and result',
    description:
      'Returns the most recent extraction attempt for the prescription, including preliminary drafts and catalogue matching suggestions.',
  })
  @ApiParam({ name: 'prescriptionId', description: 'UUID of the prescription document' })
  @ApiResponse({ status: 200, description: 'Latest extraction details' })
  @ApiResponse({ status: 404, description: 'No extraction attempts found' })
  async getLatestExtraction(
    @CurrentUser('id') customerUserId: string,
    @Param('prescriptionId') prescriptionId: string,
  ) {
    return this.prescriptionAiService.getLatestExtraction(customerUserId, prescriptionId);
  }

  @Get(':prescriptionId/extractions/:extractionId')
  @ApiOperation({
    summary: 'Get specific extraction attempt details',
    description: 'Retrieves details and matching results for a specific extraction attempt ID.',
  })
  @ApiParam({ name: 'prescriptionId', description: 'UUID of the prescription document' })
  @ApiParam({ name: 'extractionId', description: 'UUID of the extraction record' })
  @ApiResponse({ status: 200, description: 'Extraction record details' })
  @ApiResponse({ status: 404, description: 'Extraction record not found' })
  async getExtractionById(
    @CurrentUser('id') customerUserId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Param('extractionId') extractionId: string,
  ) {
    return this.prescriptionAiService.getExtractionById(
      customerUserId,
      prescriptionId,
      extractionId,
    );
  }

  @Post(':prescriptionId/extractions/:extractionId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Retry a failed or unreadable extraction',
    description:
      'Creates a new extraction attempt for a prescription whose previous extraction failed or requires re-upload.',
  })
  @ApiParam({ name: 'prescriptionId', description: 'UUID of the prescription document' })
  @ApiParam({ name: 'extractionId', description: 'UUID of the failed/unreadable attempt' })
  @ApiResponse({ status: 202, description: 'New extraction attempt queued' })
  @ApiResponse({ status: 400, description: 'Extraction cannot be retried or limit reached' })
  @ApiResponse({ status: 404, description: 'Extraction record not found' })
  @ApiResponse({ status: 409, description: 'An extraction attempt is currently active' })
  async retryExtraction(
    @CurrentUser('id') customerUserId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Param('extractionId') extractionId: string,
    @Body() dto: RetryPrescriptionExtractionDto,
  ) {
    return this.prescriptionAiService.retryExtraction(
      customerUserId,
      prescriptionId,
      extractionId,
      dto,
    );
  }
}
