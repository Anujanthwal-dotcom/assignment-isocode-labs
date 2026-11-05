import { BadRequestException } from '@nestjs/common';

export interface ValidatedPrescriptionFile {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  originalFileName: string;
  sizeBytes: number;
}

export function validatePrescriptionFile(file: Express.Multer.File): ValidatedPrescriptionFile {
  if (!file || !file.buffer) {
    throw new BadRequestException({
      code: 'MISSING_FILE',
      message: 'Prescription file is required.',
    });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.buffer.length > MAX_FILE_SIZE) {
    throw new BadRequestException({
      code: 'FILE_TOO_LARGE',
      message: 'Prescription file exceeds the 10 MB size limit.',
    });
  }

  const buf = file.buffer;
  if (buf.length < 8) {
    throw new BadRequestException({
      code: 'INVALID_FILE',
      message: 'File content is corrupted or too small.',
    });
  }

  // 1. Check JPEG magic bytes: FF D8 FF
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

  // 2. Check PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;

  // 3. Check PDF magic bytes: %PDF-
  const isPdf = buf.subarray(0, 5).toString('ascii') === '%PDF-';

  if (!isJpeg && !isPng && !isPdf) {
    throw new BadRequestException({
      code: 'UNSUPPORTED_FILE_FORMAT',
      message:
        'Only JPEG, PNG, and PDF prescription documents are supported. Executables and other formats are strictly rejected.',
    });
  }

  let mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';

  if (isJpeg) {
    mimeType = 'image/jpeg';
  } else if (isPng) {
    mimeType = 'image/png';
  } else {
    mimeType = 'application/pdf';

    // Verify PDF page count (maximum 10 pages)
    const pdfContent = buf.toString('latin1');
    const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : 1;

    if (pageCount > 10) {
      throw new BadRequestException({
        code: 'PDF_EXCEEDS_PAGE_LIMIT',
        message: `PDF contains ${pageCount} pages, which exceeds the maximum allowed limit of 10 pages.`,
      });
    }
  }

  return {
    buffer: buf,
    mimeType,
    originalFileName: file.originalname || 'prescription',
    sizeBytes: buf.length,
  };
}
