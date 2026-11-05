import {
  Controller,
  Get,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Customer Invoices')
@Controller('customer/orders')
@ApiBearerAuth()
export class CustomerInvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':orderId/invoice')
  @ApiOperation({ summary: 'Customer views invoice for their completed/packed order' })
  async getCustomerInvoice(
    @Param('orderId') orderId: string,
    @CurrentUser('id') customerUserId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { customerUserId: true },
    });

    if (!order || order.customerUserId !== customerUserId) {
      throw new ForbiddenException('Cannot access invoice for this order.');
    }

    return this.invoiceService.getInvoiceByOrderId(orderId);
  }
}
