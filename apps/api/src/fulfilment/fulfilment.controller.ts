import { Controller, Get, Post, Param, Body, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, HandoverType } from '@prisma/client';
import { FulfilmentService } from './fulfilment.service';
import { PickingService } from './picking.service';
import { PackingService } from './packing.service';
import { InvoiceService } from './invoice.service';
import { HandoverService } from './handover.service';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export class ConfirmPickItemDto {
  @IsNumber()
  @IsNotEmpty()
  quantityPicked!: number;
}

export class ReportPickExceptionDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class CompletePackingDto {
  @IsBoolean()
  checklistConfirmed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordHandoverDto {
  @IsEnum(HandoverType)
  handoverType!: HandoverType;

  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  deliveryPartnerName?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordCodCollectionDto {
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}

@ApiTags('Pharmacist Store Fulfilment')
@Controller('pharmacist/fulfilment')
@ApiBearerAuth()
export class FulfilmentController {
  constructor(
    private readonly fulfilmentService: FulfilmentService,
    private readonly pickingService: PickingService,
    private readonly packingService: PackingService,
    private readonly invoiceService: InvoiceService,
    private readonly handoverService: HandoverService,
    private readonly prisma: PrismaService,
  ) {}

  private async getPharmacistStoreId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { pharmacistProfile: true, staffProfile: true },
    });
    const storeId = user?.pharmacistProfile?.storeId || user?.staffProfile?.storeId;
    if (!storeId) {
      throw new ForbiddenException('User is not assigned to any physical store.');
    }
    return storeId;
  }

  @Get()
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Store-scoped fulfilment orders queue' })
  async getQueue(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.fulfilmentService.getStoreFulfilmentQueue(storeId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get(':orderId')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Store fulfilment order detail' })
  async getOrderDetail(@Param('orderId') orderId: string, @CurrentUser('id') userId: string) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.fulfilmentService.getOrderFulfilmentDetail(orderId, storeId);
  }

  @Post(':orderId/picking/start')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Start picking workflow for order' })
  async startPicking(@Param('orderId') orderId: string, @CurrentUser('id') userId: string) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.pickingService.startPicking(orderId, storeId, userId);
  }

  @Get(':orderId/picking')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Get order picking checklist' })
  async getPickingChecklist(@Param('orderId') orderId: string, @CurrentUser('id') userId: string) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.pickingService.getPickingChecklist(orderId, storeId);
  }

  @Post(':orderId/picking/items/:orderItemId/confirm')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Confirm individual item picked' })
  async confirmItemPick(
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: ConfirmPickItemDto,
    @CurrentUser('id') userId: string,
  ) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.pickingService.confirmItemPicked(
      orderId,
      orderItemId,
      dto.quantityPicked,
      storeId,
      userId,
    );
  }

  @Post(':orderId/picking/items/:orderItemId/exception')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Report exception on individual item during picking' })
  async reportItemException(
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: ReportPickExceptionDto,
    @CurrentUser('id') userId: string,
  ) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.pickingService.reportItemException(
      orderId,
      orderItemId,
      dto.reason,
      storeId,
      userId,
    );
  }

  @Post(':orderId/packing/complete')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Complete packing checklist and generate invoice' })
  async completePacking(
    @Param('orderId') orderId: string,
    @Body() dto: CompletePackingDto,
    @CurrentUser('id') userId: string,
  ) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.packingService.completePacking(orderId, storeId, userId, dto.notes);
  }

  @Get(':orderId/invoice')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Get store invoice for order' })
  async getInvoice(@Param('orderId') orderId: string, @CurrentUser('id') userId: string) {
    await this.getPharmacistStoreId(userId);
    return this.invoiceService.getInvoiceByOrderId(orderId);
  }

  @Post(':orderId/handover')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Record order handover to delivery partner or customer' })
  async recordHandover(
    @Param('orderId') orderId: string,
    @Body() dto: RecordHandoverDto,
    @CurrentUser('id') userId: string,
  ) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.handoverService.recordHandover({
      orderId,
      storeId,
      pharmacistUserId: userId,
      handoverType: dto.handoverType,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      deliveryPartnerName: dto.deliveryPartnerName,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
    });
  }

  @Post(':orderId/cod-collection')
  @Roles(UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'Record COD payment collection at handover' })
  async recordCodCollection(
    @Param('orderId') orderId: string,
    @Body() dto: RecordCodCollectionDto,
    @CurrentUser('id') userId: string,
  ) {
    const storeId = await this.getPharmacistStoreId(userId);
    return this.handoverService.recordCodCollection({
      orderId,
      storeId,
      pharmacistUserId: userId,
      amount: dto.amount,
      paymentReference: dto.paymentReference,
    });
  }
}
