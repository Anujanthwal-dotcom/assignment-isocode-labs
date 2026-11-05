import { Module } from '@nestjs/common';
import { InventoryImportsService } from './inventory-imports.service';
import { InventoryImportsController } from './inventory-imports.controller';
import { CsvParserService } from './csv-parser.service';
import { CsvValidationService } from './csv-validation.service';

@Module({
  controllers: [InventoryImportsController],
  providers: [InventoryImportsService, CsvParserService, CsvValidationService],
  exports: [InventoryImportsService],
})
export class InventoryImportsModule {}
