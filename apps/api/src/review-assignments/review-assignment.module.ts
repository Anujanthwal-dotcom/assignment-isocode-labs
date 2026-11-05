import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ReviewAssignmentService } from './review-assignment.service';
import { ReviewAssignmentController } from './review-assignment.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ReviewAssignmentController],
  providers: [ReviewAssignmentService],
  exports: [ReviewAssignmentService],
})
export class ReviewAssignmentModule {}
