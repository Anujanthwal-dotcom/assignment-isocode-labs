import { describe, it, expect } from 'vitest';
import { validatePrescriptionFile } from './prescription-file.validator';
import { BadRequestException } from '@nestjs/common';

describe('Prescription File Validator', () => {
  it('accepts valid JPEG files', () => {
    // FF D8 FF E0 ...
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const mockFile: Express.Multer.File = {
      buffer: jpegBuffer,
      originalname: 'rx.jpg',
      mimetype: 'image/jpeg',
      fieldname: 'file',
      encoding: '7bit',
      size: jpegBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const res = validatePrescriptionFile(mockFile);
    expect(res.mimeType).toBe('image/jpeg');
    expect(res.sizeBytes).toBe(jpegBuffer.length);
  });

  it('accepts valid PNG files', () => {
    // 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const mockFile: Express.Multer.File = {
      buffer: pngBuffer,
      originalname: 'rx.png',
      mimetype: 'image/png',
      fieldname: 'file',
      encoding: '7bit',
      size: pngBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const res = validatePrescriptionFile(mockFile);
    expect(res.mimeType).toBe('image/png');
  });

  it('accepts valid PDF files with <= 10 pages', () => {
    const pdfString =
      '%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n2 0 obj\n<< /Type /Page >>\nendobj\n%%EOF';
    const pdfBuffer = Buffer.from(pdfString);
    const mockFile: Express.Multer.File = {
      buffer: pdfBuffer,
      originalname: 'prescription.pdf',
      mimetype: 'application/pdf',
      fieldname: 'file',
      encoding: '7bit',
      size: pdfBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const res = validatePrescriptionFile(mockFile);
    expect(res.mimeType).toBe('application/pdf');
  });

  it('rejects PDF files exceeding 10 pages', () => {
    let pdfString = '%PDF-1.4\n';
    for (let i = 0; i < 11; i++) {
      pdfString += `${i + 1} 0 obj\n<< /Type /Page >>\nendobj\n`;
    }
    pdfString += '%%EOF';

    const pdfBuffer = Buffer.from(pdfString);
    const mockFile: Express.Multer.File = {
      buffer: pdfBuffer,
      originalname: 'long-prescription.pdf',
      mimetype: 'application/pdf',
      fieldname: 'file',
      encoding: '7bit',
      size: pdfBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    expect(() => validatePrescriptionFile(mockFile)).toThrow(BadRequestException);
  });

  it('rejects unsupported or executable files (magic bytes check)', () => {
    // Windows PE / MZ executable
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const mockFile: Express.Multer.File = {
      buffer: exeBuffer,
      originalname: 'malware.jpg',
      mimetype: 'image/jpeg', // Spoofed mime
      fieldname: 'file',
      encoding: '7bit',
      size: exeBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    expect(() => validatePrescriptionFile(mockFile)).toThrow(BadRequestException);
  });

  it('rejects oversized files (> 10MB)', () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    largeBuffer[0] = 0xff;
    largeBuffer[1] = 0xd8;
    largeBuffer[2] = 0xff;

    const mockFile: Express.Multer.File = {
      buffer: largeBuffer,
      originalname: 'oversized.jpg',
      mimetype: 'image/jpeg',
      fieldname: 'file',
      encoding: '7bit',
      size: largeBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    expect(() => validatePrescriptionFile(mockFile)).toThrow(BadRequestException);
  });
});
