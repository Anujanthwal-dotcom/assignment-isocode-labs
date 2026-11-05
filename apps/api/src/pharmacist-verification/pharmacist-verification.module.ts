import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { PharmacistVerificationService } from './pharmacist-verification.service';
import { PharmacistVerificationController } from './pharmacist-verification.controller';

@Module({
  imports: [PrismaModule, StorageModule, AuditModule, ComplianceModule],
  controllers: [PharmacistVerificationController],
  providers: [PharmacistVerificationService],
  exports: [PharmacistVerificationService],
})
export class PharmacistVerificationModule {}
