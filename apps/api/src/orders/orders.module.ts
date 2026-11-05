import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderNumberService } from './order-number.service';
import { OrderStatusService } from './order-status.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [PrismaModule, AuditModule, ComplianceModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNumberService, OrderStatusService],
  exports: [OrdersService, OrderNumberService, OrderStatusService],
})
export class OrdersModule {}
