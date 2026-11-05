import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { OrderRoutingModule } from '../order-routing/order-routing.module';
import { RefillsModule } from '../refills/refills.module';
import { FulfilmentService } from './fulfilment.service';
import { PickingService } from './picking.service';
import { PackingService } from './packing.service';
import { InvoiceService } from './invoice.service';
import { HandoverService } from './handover.service';
import { FulfilmentController } from './fulfilment.controller';
import { AdminFulfilmentController } from './admin-fulfilment.controller';
import { CustomerInvoiceController } from './customer-invoice.controller';

@Module({
  imports: [PrismaModule, AuditModule, OrdersModule, OrderRoutingModule, RefillsModule],
  controllers: [
    FulfilmentController,
    AdminFulfilmentController,
    CustomerInvoiceController,
  ],
  providers: [
    FulfilmentService,
    PickingService,
    PackingService,
    InvoiceService,
    HandoverService,
  ],
  exports: [
    FulfilmentService,
    PickingService,
    PackingService,
    InvoiceService,
    HandoverService,
  ],
})
export class FulfilmentModule {}
