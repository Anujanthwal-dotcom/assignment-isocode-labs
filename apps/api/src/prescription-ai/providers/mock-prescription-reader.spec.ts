import { describe, it, expect } from 'vitest';
import { MockPrescriptionReader } from './mock-prescription-reader.provider';
import { validatePrescriptionExtraction } from '@pharmacy/validation';

describe('MockPrescriptionReader', () => {
  const reader = new MockPrescriptionReader();
  const dummyBuffer = Buffer.from('mock prescription data');

  it('returns readable prescription fixture by default', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/jpeg',
      originalFileName: 'prescription.jpg',
      attemptNumber: 1,
    });

    expect(result.documentReadable).toBe(true);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0.9);
    expect(result.items.length).toBe(1);
    expect(result.items[0].rawMedicineName).toContain('Metformin');
    expect(result.items[0].strength).toBe('500 mg');
    expect(result.items[0].quantity).toBe(4);

    const validation = validatePrescriptionExtraction(result);
    expect(validation.valid).toBe(true);
  });

  it('returns multi-item fixture when filename or hint contains "multi"', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'application/pdf',
      originalFileName: 'doctor-rx-multi.pdf',
      attemptNumber: 1,
    });

    expect(result.documentReadable).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items[0].rawMedicineName).toContain('Metformin');
    expect(result.items[1].rawMedicineName).toContain('Amoxicillin');

    const validation = validatePrescriptionExtraction(result);
    expect(validation.valid).toBe(true);
  });

  it('returns ambiguous fixture when hint contains "ambiguous"', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/png',
      originalFileName: 'rx.png',
      attemptNumber: 1,
      fixtureHint: 'ambiguous',
    });

    expect(result.documentReadable).toBe(true);
    expect(result.overallConfidence).toBeLessThan(0.7);
    expect(result.items[0].strength).toBeNull();
    expect(result.items[0].warnings.length).toBeGreaterThan(0);
  });

  it('returns unreadable fixture when hint contains "unreadable"', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/jpeg',
      originalFileName: 'blurry-scan-unreadable.jpg',
      attemptNumber: 1,
    });

    expect(result.documentReadable).toBe(false);
    expect(result.items).toHaveLength(0);
    expect(result.unreadableSections.length).toBeGreaterThan(0);
    expect(result.generalWarnings.length).toBeGreaterThan(0);

    const validation = validatePrescriptionExtraction(result);
    expect(validation.valid).toBe(true);
  });

  it('simulates transient failure on attempt 1 and recovers on retry', async () => {
    await expect(
      reader.extract({
        buffer: dummyBuffer,
        mimeType: 'image/png',
        originalFileName: 'test-failure.png',
        attemptNumber: 1,
      }),
    ).rejects.toThrow('simulated transient failure');

    // On attempt 2, should recover and succeed
    const recovery = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/png',
      originalFileName: 'test-failure.png',
      attemptNumber: 2,
    });
    expect(recovery.documentReadable).toBe(true);
  });

  it('simulates provider timeout', async () => {
    await expect(
      reader.extract({
        buffer: dummyBuffer,
        mimeType: 'image/png',
        originalFileName: 'rx-timeout.png',
        attemptNumber: 1,
      }),
    ).rejects.toThrow('timeout');
  });

  it('simulates malformed provider response', async () => {
    await expect(
      reader.extract({
        buffer: dummyBuffer,
        mimeType: 'image/png',
        originalFileName: 'rx-malformed.png',
        attemptNumber: 1,
      }),
    ).rejects.toThrow('Malformed provider response');
  });

  it('returns low confidence extraction with explicit warnings', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/jpeg',
      originalFileName: 'rx-low-confidence.jpg',
      attemptNumber: 1,
    });
    expect(result.documentReadable).toBe(true);
    expect(result.overallConfidence).toBeLessThan(0.5);
    expect(result.generalWarnings.length).toBeGreaterThan(0);
  });

  it('returns handwritten partially readable extraction', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/jpeg',
      originalFileName: 'rx-handwritten.jpg',
      attemptNumber: 1,
    });
    expect(result.documentReadable).toBe(true);
    expect(result.overallConfidence).toBe(0.65);
    expect(result.unreadableSections.length).toBeGreaterThan(0);
  });

  it('returns missing dosage instructions extraction', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/jpeg',
      originalFileName: 'rx-missing-dosage.jpg',
      attemptNumber: 1,
    });
    expect(result.items[0].dosageInstructions).toBeNull();
    expect(result.items[0].warnings).toContain('Dosage instructions not specified on prescription');
  });

  it('returns missing quantity extraction', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/jpeg',
      originalFileName: 'rx-missing-quantity.jpg',
      attemptNumber: 1,
    });
    expect(result.items[0].quantity).toBeNull();
    expect(result.items[0].warnings).toContain('Dispensing quantity not explicitly stated');
  });

  it('returns uncatalogued medicine extraction', async () => {
    const result = await reader.extract({
      buffer: dummyBuffer,
      mimeType: 'image/jpeg',
      originalFileName: 'rx-unmatched.jpg',
      attemptNumber: 1,
    });
    expect(result.items[0].rawMedicineName).toContain('Cefuroxime Axetil');
  });
});
