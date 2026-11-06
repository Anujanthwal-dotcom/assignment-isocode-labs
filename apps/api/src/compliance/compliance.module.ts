import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ComplianceRuleService } from './compliance-rule.service';
import { ComplianceEvaluatorService } from './compliance-evaluator.service';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ComplianceController],
  providers: [ComplianceRuleService, ComplianceEvaluatorService, ComplianceService],
  exports: [ComplianceRuleService, ComplianceEvaluatorService, ComplianceService],
})
export class ComplianceModule {}
