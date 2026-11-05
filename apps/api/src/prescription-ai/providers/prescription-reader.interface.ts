import { PrescriptionExtractionResultDTO } from '@pharmacy/shared-types';

export interface PrescriptionReaderInput {
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
  attemptNumber: number;
  fixtureHint?: string;
}

export interface PrescriptionReader {
  extract(input: PrescriptionReaderInput): Promise<PrescriptionExtractionResultDTO>;
}

export const PRESCRIPTION_READER = Symbol('PRESCRIPTION_READER');
