import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

const mockClientInstance = {
  bucketExists: vi.fn().mockResolvedValue(true),
  makeBucket: vi.fn().mockResolvedValue(undefined),
  putObject: vi.fn().mockResolvedValue({ etag: 'test-etag' }),
  getObject: vi.fn().mockImplementation(() => {
    const s = new Readable();
    s.push('test-content');
    s.push(null);
    return Promise.resolve(s);
  }),
  statObject: vi.fn().mockResolvedValue({ size: 100 }),
  presignedGetObject: vi.fn().mockResolvedValue('https://minio.local/prescriptions/test.jpg?token=123'),
  removeObject: vi.fn().mockResolvedValue(undefined),
};

vi.mock('minio', () => {
  return {
    Client: vi.fn().mockImplementation(function (this: any) {
      return mockClientInstance;
    }),
  };
});

describe('StorageService', () => {
  let service: StorageService;
  let mockConfig: Record<string, any>;

  const createService = (configOverrides: Record<string, any> = {}) => {
    mockConfig = {
      'minio.endpoint': 'localhost',
      'minio.port': 9000,
      'minio.useSSL': false,
      'minio.rootUser': 'minio_admin',
      'minio.rootPassword': 'minio_admin_secret_key',
      'minio.bucketInventoryImports': 'inventory-imports',
      'minio.bucketPrescriptions': 'prescriptions',
      'minio.sseMode': 'AES256',
      'minio.kmsKeyId': '',
      ...configOverrides,
    };

    const configService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        return mockConfig[key] !== undefined ? mockConfig[key] : defaultValue;
      }),
    } as unknown as ConfigService;

    return new StorageService(configService);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClientInstance.bucketExists.mockResolvedValue(true);
    mockClientInstance.makeBucket.mockResolvedValue(undefined);
    mockClientInstance.putObject.mockResolvedValue({ etag: 'test-etag' });
    mockClientInstance.statObject.mockResolvedValue({ size: 100 });
    mockClientInstance.presignedGetObject.mockResolvedValue(
      'https://minio.local/prescriptions/test.jpg?token=123',
    );
    mockClientInstance.removeObject.mockResolvedValue(undefined);

    service = createService();
    await service.onModuleInit();
  });

  it('should initialize buckets and configure SSE-S3 mode', async () => {
    expect(mockClientInstance.bucketExists).toHaveBeenCalledWith('prescriptions');
    expect((service as any).sseMode).toBe('AES256');
    expect((service as any).kmsKeyId).toBe('');
  });

  it('should upload prescription with AES256 server-side encryption header', async () => {
    const buffer = Buffer.from('prescription scan binary');
    const objectKey = await service.uploadPrescriptionFile(
      buffer,
      'patient-rx.jpg',
      'image/jpeg',
    );

    expect(objectKey).toMatch(/^prescriptions\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.jpg$/);
    expect(mockClientInstance.putObject).toHaveBeenCalledWith(
      'prescriptions',
      objectKey,
      buffer,
      buffer.length,
      expect.objectContaining({
        'Content-Type': 'image/jpeg',
        'X-Original-Filename': encodeURIComponent('patient-rx.jpg'),
        'X-Amz-Server-Side-Encryption': 'AES256',
      }),
    );
  });

  it('should upload prescription with KMS server-side encryption and key ID when configured', async () => {
    const kmsService = createService({
      'minio.sseMode': 'aws:kms',
      'minio.kmsKeyId': 'arn:aws:kms:ap-south-1:123456789012:key/rx-key-id',
    });
    await kmsService.onModuleInit();

    const buffer = Buffer.from('prescription scan binary');
    const objectKey = await kmsService.uploadPrescriptionFile(
      buffer,
      'doctor-note.pdf',
      'application/pdf',
    );

    expect(objectKey).toMatch(/^prescriptions\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.pdf$/);
    expect(mockClientInstance.putObject).toHaveBeenCalledWith(
      'prescriptions',
      objectKey,
      buffer,
      buffer.length,
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'X-Original-Filename': encodeURIComponent('doctor-note.pdf'),
        'X-Amz-Server-Side-Encryption': 'aws:kms',
        'X-Amz-Server-Side-Encryption-Aws-Kms-Key-Id':
          'arn:aws:kms:ap-south-1:123456789012:key/rx-key-id',
      }),
    );
  });

  it('should upload prescription without SSE headers when encryption is disabled', async () => {
    const noSseService = createService({
      'minio.sseMode': '',
      'minio.kmsKeyId': '',
    });
    await noSseService.onModuleInit();

    const buffer = Buffer.from('prescription scan binary');
    const objectKey = await noSseService.uploadPrescriptionFile(
      buffer,
      'plain-rx.png',
      'image/png',
    );

    expect(mockClientInstance.putObject).toHaveBeenCalledWith(
      'prescriptions',
      objectKey,
      buffer,
      buffer.length,
      {
        'Content-Type': 'image/png',
        'X-Original-Filename': encodeURIComponent('plain-rx.png'),
      },
    );
  });

  it('should generate pre-signed URL with specified expiry', async () => {
    const url = await service.getPresignedPrescriptionUrl('prescriptions/2026-11-09/test.jpg', 600);

    expect(mockClientInstance.presignedGetObject).toHaveBeenCalledWith(
      'prescriptions',
      'prescriptions/2026-11-09/test.jpg',
      600,
    );
    expect(url).toBe('https://minio.local/prescriptions/test.jpg?token=123');
  });

  it('should stream and buffer prescription content', async () => {
    const buffer = await service.getPrescriptionBuffer('prescriptions/2026-11-09/test.jpg');
    expect(buffer.toString()).toBe('test-content');
  });

  it('should check if prescription exists', async () => {
    const exists = await service.prescriptionFileExists('prescriptions/2026-11-09/test.jpg');
    expect(exists).toBe(true);
  });

  it('should delete prescription file', async () => {
    await service.deletePrescriptionFile('prescriptions/2026-11-09/test.jpg');
    expect(mockClientInstance.removeObject).toHaveBeenCalledWith(
      'prescriptions',
      'prescriptions/2026-11-09/test.jpg',
    );
  });
});
