import { Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PharmacistVerificationService } from './pharmacist-verification.service';
import {
  UpdateOrderItemReviewDto,
  ApproveOrderItemDto,
  RejectOrderItemDto,
  BlockOrderItemDto,
  ProposeAlternativeDto,
  RejectPrescriptionDto,
  RequestReuploadDto,
  PharmacistQueueQueryDto,
  CreatePrescriptionQuoteDto,
} from './pharmacist-verification.dto';

@ApiTags('Pharmacist Verification')
@ApiBearerAuth()
@Roles(UserRole.PHARMACIST)
@Controller('pharmacist')
export class PharmacistVerificationController {
  constructor(private readonly verificationService: PharmacistVerificationService) {}

  @Get('review-queue')
  @ApiOperation({ summary: 'Store-scoped queue of orders requiring prescription verification' })
  async getQueue(@CurrentUser('id') userId: string, @Query() query: PharmacistQueueQueryDto) {
    return this.verificationService.getQueue(userId, query);
  }

  @Get('orders/:orderId/review')
  @ApiOperation({ summary: 'Get side-by-side prescription verification review screen details' })
  async getReviewDetail(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.getReviewDetail(orderId, userId);
  }

  @Patch('reviews/:reviewId/items/:orderItemId')
  @ApiOperation({ summary: 'Correct extracted fields or change matched catalogue medicine' })
  async updateItemReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: UpdateOrderItemReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.updateItemReview(reviewId, orderItemId, dto, userId);
  }

  @Post('reviews/:reviewId/items/:orderItemId/approve')
  @ApiOperation({
    summary: 'Approve an individual medicine item after deterministic compliance checks',
  })
  async approveItem(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: ApproveOrderItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.approveItem(reviewId, orderItemId, dto, userId);
  }

  @Post('reviews/:reviewId/items/:orderItemId/reject')
  @ApiOperation({ summary: 'Reject an individual medicine item with mandatory reason' })
  async rejectItem(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: RejectOrderItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.rejectItem(reviewId, orderItemId, dto, userId);
  }

  @Post('reviews/:reviewId/items/:orderItemId/block')
  @ApiOperation({ summary: 'Mark an individual medicine item as BLOCKED under compliance policy' })
  async blockItem(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: BlockOrderItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.blockItem(reviewId, orderItemId, dto, userId);
  }

  @Post('reviews/:reviewId/items/:orderItemId/propose-alternative')
  @ApiOperation({ summary: 'Propose an eligible generic alternative requiring customer consent' })
  async proposeAlternative(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: ProposeAlternativeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.proposeAlternative(reviewId, orderItemId, dto, userId);
  }

  @Post('reviews/:reviewId/approve')
  @ApiOperation({ summary: 'Approve entire prescription review once all items have decisions' })
  async approvePrescription(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.approvePrescription(reviewId, userId);
  }

  @Post('reviews/:reviewId/reject')
  @ApiOperation({ summary: 'Reject entire prescription with mandatory reason' })
  async rejectPrescription(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: RejectPrescriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.rejectPrescription(reviewId, dto, userId);
  }

  @Post('reviews/:reviewId/request-reupload')
  @ApiOperation({ summary: 'Request customer prescription re-upload with mandatory reason' })
  async requestReupload(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: RequestReuploadDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.requestReupload(reviewId, dto, userId);
  }

  // ========================================================
  // Prescription-First Verification & Quotation Endpoints
  // ========================================================

  @Get('prescription-queue')
  @ApiOperation({ summary: 'Queue of uploaded prescriptions awaiting pharmacist verification and quotation' })
  async getPrescriptionQueue(@CurrentUser('id') userId: string) {
    return this.verificationService.getPrescriptionQueue(userId);
  }

  @Get('prescriptions/:prescriptionId/review-details')
  @ApiOperation({ summary: 'Prescription scan document preview, AI candidates with catalogue comparison, and quotation draft' })
  async getPrescriptionVerificationDetail(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.getPrescriptionVerificationDetail(prescriptionId, userId);
  }

  @Post('prescriptions/:prescriptionId/quote')
  @ApiOperation({ summary: 'Generate and send verified medicine price quotation to customer' })
  async createPrescriptionQuote(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: CreatePrescriptionQuoteDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.createPrescriptionQuote(prescriptionId, dto, userId);
  }

  @Post('prescriptions/:prescriptionId/reject')
  @ApiOperation({ summary: 'Reject prescription directly with mandatory reason' })
  async rejectPrescriptionDirectly(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: RejectPrescriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.rejectPrescriptionDirectly(prescriptionId, dto, userId);
  }

  @Post('prescriptions/:prescriptionId/request-reupload')
  @ApiOperation({ summary: 'Request customer prescription re-upload directly with mandatory reason' })
  async requestPrescriptionReuploadDirectly(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: RequestReuploadDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.requestPrescriptionReuploadDirectly(prescriptionId, dto, userId);
  }
}
