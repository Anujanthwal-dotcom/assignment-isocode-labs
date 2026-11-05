import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { MockPaymentService } from './mock-payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PaymentsController],
  providers: [MockPaymentService],
  exports: [MockPaymentService],
})
export class PaymentsModule {}
