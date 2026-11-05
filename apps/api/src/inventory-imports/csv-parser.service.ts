import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface RawParsedRow {
  rowNumber: number; // 1-indexed row number from CSV including header offset (header is row 1, data starts row 2)
  sku: string;
  quantity: string;
  reorderLevel: string;
}

@Injectable()
export class CsvParserService {
  private readonly MAX_ROWS = 10000;
  private readonly MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  parseBuffer(buffer: Buffer): RawParsedRow[] {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'EMPTY_CSV_FILE',
        message: 'Uploaded CSV file is empty.',
      });
    }

    if (buffer.length > this.MAX_BYTES) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'CSV_FILE_TOO_LARGE',
        message: 'CSV file exceeds maximum allowed size of 5 MB.',
      });
    }

    let records: string[][];
    try {
      records = parse(buffer, {
        trim: true,
        skip_empty_lines: true,
        relax_column_count: false,
      });
    } catch (err: any) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'MALFORMED_CSV',
        message: `CSV parsing error: ${err.message}`,
      });
    }

    if (!records || records.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'EMPTY_CSV_FILE',
        message: 'CSV file contains no rows.',
      });
    }

    // 1. Validate headers
    const headerRow = records[0].map((h) => h.trim().toLowerCase());
    const expectedHeaders = ['sku', 'quantity', 'reorderlevel'];

    const matchesExpected =
      headerRow.length === 3 &&
      headerRow[0] === expectedHeaders[0] &&
      headerRow[1] === expectedHeaders[1] &&
      headerRow[2] === expectedHeaders[2];

    if (!matchesExpected) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_CSV_HEADERS',
        message: `CSV header must match exactly: 'sku,quantity,reorderLevel'. Found: '${records[0].join(',')}'`,
      });
    }

    const dataRows = records.slice(1);
    if (dataRows.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'EMPTY_CSV_FILE',
        message: 'CSV contains headers but no data rows.',
      });
    }

    if (dataRows.length > this.MAX_ROWS) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'CSV_ROW_LIMIT_EXCEEDED',
        message: `CSV contains ${dataRows.length} rows, exceeding the limit of 10,000 data rows.`,
      });
    }

    return dataRows.map((cols, idx) => ({
      rowNumber: idx + 2, // Header is row 1
      sku: cols[0] || '',
      quantity: cols[1] || '',
      reorderLevel: cols[2] || '',
    }));
  }
}
