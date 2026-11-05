import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import {
  PrescriptionAiService,
  PRESCRIPTION_AI_QUEUE,
} from './prescription-ai.service';
import { PrescriptionAiProcessor } from './prescription-ai.processor';
import { PrescriptionAiController } from './prescription-ai.controller';
import { MedicineMatchingService } from './matching/medicine-matching.service';
import { MockPrescriptionReader } from './providers/mock-prescription-reader.provider';
import { GeminiLangChainPrescriptionReader } from './providers/gemini-langchain-prescription-reader.provider';
import { PRESCRIPTION_READER } from './providers/prescription-reader.interface';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuditModule,
    BullModule.registerQueue({
      name: PRESCRIPTION_AI_QUEUE,
    }),
  ],
  controllers: [PrescriptionAiController],
  providers: [
    PrescriptionAiService,
    PrescriptionAiProcessor,
    MedicineMatchingService,
    MockPrescriptionReader,
    GeminiLangChainPrescriptionReader,
    {
      provide: PRESCRIPTION_READER,
      useFactory: (
        configService: ConfigService,
        mockReader: MockPrescriptionReader,
        geminiReader: GeminiLangChainPrescriptionReader,
      ) => {
        const provider = configService.get<string>('prescriptionAi.provider', 'mock');
        if (provider === 'gemini') {
          return geminiReader;
        }
        return mockReader;
      },
      inject: [ConfigService, MockPrescriptionReader, GeminiLangChainPrescriptionReader],
    },
  ],
  exports: [PrescriptionAiService, MedicineMatchingService, PRESCRIPTION_READER],
})
export class PrescriptionAiModule {}
