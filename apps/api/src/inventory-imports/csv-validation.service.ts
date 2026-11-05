import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RawParsedRow } from './csv-parser.service';
import { validateCsvRow } from '@pharmacy/validation';
import { MedicineStatus } from '@prisma/client';

export interface ValidatedImportRow {
  rowNumber: number;
  sku: string;
  medicineId: string;
  quantity: number;
  reorderLevel: number;
}

export interface RejectedImportRow {
  rowNumber: number;
  sku: string;
  medicineId?: string;
  quantity?: number;
  errorMessage: string;
}

export interface BatchValidationResult {
  isValid: boolean;
  validRows: ValidatedImportRow[];
  rejectedRows: RejectedImportRow[];
}

@Injectable()
export class CsvValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateRows(rawRows: RawParsedRow[]): Promise<BatchValidationResult> {
    const rejectedRows: RejectedImportRow[] = [];
    const syntacticallyValidRows: Array<{
      rowNumber: number;
      sku: string;
      quantity: number;
      reorderLevel: number;
    }> = [];

    // 1. Check duplicate SKUs in file
    const seenSkus = new Map<string, number>(); // sku -> first rowNumber
    const duplicateSkus = new Set<string>();

    for (const row of rawRows) {
      const normalizedSku = row.sku.trim().toUpperCase();
      if (seenSkus.has(normalizedSku)) {
        duplicateSkus.add(normalizedSku);
      } else {
        seenSkus.set(normalizedSku, row.rowNumber);
      }
    }

    // 2. Syntax & Value Validation per row
    for (const row of rawRows) {
      const normalizedSku = row.sku.trim().toUpperCase();

      if (duplicateSkus.has(normalizedSku)) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          errorMessage: `Duplicate SKU '${row.sku}' found in CSV file.`,
        });
        continue;
      }

      const valResult = validateCsvRow(row, row.rowNumber);
      if (
        !valResult.valid ||
        valResult.quantity === undefined ||
        valResult.reorderLevel === undefined
      ) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          errorMessage: valResult.errorMessage || 'Invalid row values.',
        });
        continue;
      }

      syntacticallyValidRows.push({
        rowNumber: row.rowNumber,
        sku: valResult.sku!,
        quantity: valResult.quantity,
        reorderLevel: valResult.reorderLevel,
      });
    }

    // 3. Catalogue lookup for syntactically valid SKUs
    const uniqueSkus = Array.from(new Set(syntacticallyValidRows.map((r) => r.sku)));
    const existingMedicines =
      uniqueSkus.length > 0
        ? await this.prisma.medicine.findMany({
            where: { sku: { in: uniqueSkus } },
            select: { id: true, sku: true, status: true },
          })
        : [];

    const medicineMap = new Map<string, { id: string; status: MedicineStatus }>();
    for (const m of existingMedicines) {
      medicineMap.set(m.sku, { id: m.id, status: m.status });
    }

    const validRows: ValidatedImportRow[] = [];

    for (const row of syntacticallyValidRows) {
      const med = medicineMap.get(row.sku);

      if (!med) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          quantity: row.quantity,
          errorMessage: `Row ${row.rowNumber}: SKU '${row.sku}' does not exist in medicine catalogue.`,
        });
      } else if (med.status !== MedicineStatus.ACTIVE) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          medicineId: med.id,
          quantity: row.quantity,
          errorMessage: `Row ${row.rowNumber}: Medicine '${row.sku}' is INACTIVE and cannot receive inventory.`,
        });
      } else {
        validRows.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          medicineId: med.id,
          quantity: row.quantity,
          reorderLevel: row.reorderLevel,
        });
      }
    }

    // Sort rejected rows by row number
    rejectedRows.sort((a, b) => a.rowNumber - b.rowNumber);

    return {
      isValid: rejectedRows.length === 0,
      validRows,
      rejectedRows,
    };
  }
}
