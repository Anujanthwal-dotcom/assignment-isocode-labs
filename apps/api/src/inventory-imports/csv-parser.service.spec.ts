import { describe, it, expect, beforeEach } from 'vitest';
import { CsvParserService } from './csv-parser.service';
import { BadRequestException } from '@nestjs/common';

describe('CsvParserService', () => {
  let service: CsvParserService;

  beforeEach(() => {
    service = new CsvParserService();
  });

  it('should parse valid CSV buffer with exact headers', () => {
    const csvContent = 'sku,quantity,reorderLevel\nMED-MET-500-001,120,20\nMED-TEL-40-001,75,15';
    const rows = service.parseBuffer(Buffer.from(csvContent));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      rowNumber: 2,
      sku: 'MED-MET-500-001',
      quantity: '120',
      reorderLevel: '20',
    });
    expect(rows[1]).toEqual({
      rowNumber: 3,
      sku: 'MED-TEL-40-001',
      quantity: '75',
      reorderLevel: '15',
    });
  });

  it('should reject empty buffer', () => {
    expect(() => service.parseBuffer(Buffer.from(''))).toThrow(BadRequestException);
  });

  it('should reject incorrect headers', () => {
    const csvContent = 'sku,qty,reorder\nMED-MET-500-001,120,20';
    expect(() => service.parseBuffer(Buffer.from(csvContent))).toThrow(BadRequestException);
  });

  it('should reject file with only headers and no data rows', () => {
    const csvContent = 'sku,quantity,reorderLevel\n';
    expect(() => service.parseBuffer(Buffer.from(csvContent))).toThrow(BadRequestException);
  });

  it('should reject malformed CSV syntax', () => {
    const csvContent = 'sku,quantity,reorderLevel\n"unclosed quote,10,5';
    expect(() => service.parseBuffer(Buffer.from(csvContent))).toThrow(BadRequestException);
  });
});
