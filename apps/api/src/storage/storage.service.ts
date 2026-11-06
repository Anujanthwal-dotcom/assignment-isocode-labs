import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: Client;
  private importBucket!: string;
  private prescriptionBucket!: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const endPoint = this.configService.get<string>('minio.endpoint', 'localhost');
    const port = this.configService.get<number>('minio.port', 9000);
    const useSSL = this.configService.get<boolean>('minio.useSSL', false);
    const accessKey = this.configService.get<string>('minio.rootUser', 'minio_admin');
    const secretKey = this.configService.get<string>(
      'minio.rootPassword',
      'minio_admin_secret_key',
    );
    this.importBucket = this.configService.get<string>(
      'minio.bucketInventoryImports',
      'inventory-imports',
    );
    this.prescriptionBucket = this.configService.get<string>(
      'minio.bucketPrescriptions',
      'prescriptions',
    );

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    try {
      // Ensure import bucket exists
      const importExists = await this.client.bucketExists(this.importBucket);
      if (!importExists) {
        await this.client.makeBucket(this.importBucket, 'us-east-1');
        this.logger.log(`Created private MinIO bucket '${this.importBucket}'`);
      } else {
        this.logger.log(`MinIO bucket '${this.importBucket}' ready`);
      }

      // Ensure prescriptions bucket exists
      const rxExists = await this.client.bucketExists(this.prescriptionBucket);
      if (!rxExists) {
        await this.client.makeBucket(this.prescriptionBucket, 'us-east-1');
        this.logger.log(`Created private MinIO bucket '${this.prescriptionBucket}'`);
      } else {
        this.logger.log(`MinIO bucket '${this.prescriptionBucket}' ready`);
      }
    } catch (err: any) {
      this.logger.warn(`MinIO bucket verification check warning: ${err.message}`);
    }
  }

  async uploadInventoryImportCsv(buffer: Buffer, originalName: string): Promise<string> {
    const safeExtension = originalName.endsWith('.csv') ? '.csv' : '';
    const datePrefix = new Date().toISOString().slice(0, 10);
    const objectKey = `imports/${datePrefix}/${randomUUID()}${safeExtension}`;

    try {
      await this.client.putObject(this.importBucket, objectKey, buffer, buffer.length, {
        'Content-Type': 'text/csv',
        'X-Original-Filename': encodeURIComponent(originalName),
      });
      this.logger.log(`Successfully uploaded CSV snapshot to MinIO: ${objectKey}`);
      return objectKey;
    } catch (err: any) {
      this.logger.error(`MinIO upload failed for ${originalName}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        'Failed to securely persist inventory CSV file in storage.',
      );
    }
  }

  async getFileStream(objectKey: string): Promise<Readable> {
    try {
      return await this.client.getObject(this.importBucket, objectKey);
    } catch (err: any) {
      this.logger.error(`Failed to retrieve file from MinIO: ${objectKey}`, err.stack);
      throw new InternalServerErrorException('Unable to read inventory snapshot from storage.');
    }
  }

  async uploadPrescriptionFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    let extension = '';
    if (
      mimeType === 'image/jpeg' ||
      originalName.toLowerCase().endsWith('.jpg') ||
      originalName.toLowerCase().endsWith('.jpeg')
    ) {
      extension = '.jpg';
    } else if (mimeType === 'image/png' || originalName.toLowerCase().endsWith('.png')) {
      extension = '.png';
    } else if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
      extension = '.pdf';
    }

    const datePrefix = new Date().toISOString().slice(0, 10);
    const objectKey = `prescriptions/${datePrefix}/${randomUUID()}${extension}`;

    try {
      await this.client.putObject(this.prescriptionBucket, objectKey, buffer, buffer.length, {
        'Content-Type': mimeType,
        'X-Original-Filename': encodeURIComponent(originalName),
      });
      this.logger.log(`Successfully uploaded prescription to private MinIO storage: ${objectKey}`);
      return objectKey;
    } catch (err: any) {
      this.logger.error(
        `MinIO upload failed for prescription ${originalName}: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to securely store prescription document.');
    }
  }

  async getPresignedPrescriptionUrl(
    objectKey: string,
    expirySeconds: number = 300,
  ): Promise<string> {
    try {
      // Pre-signed URL expiry strictly 5 minutes (300 seconds)
      return await this.client.presignedGetObject(
        this.prescriptionBucket,
        objectKey,
        expirySeconds,
      );
    } catch (err: any) {
      this.logger.error(`Failed to generate signed URL for prescription: ${objectKey}`, err.stack);
      throw new InternalServerErrorException('Failed to generate secure prescription access URL.');
    }
  }

  async getPrescriptionStream(objectKey: string): Promise<Readable> {
    try {
      return await this.client.getObject(this.prescriptionBucket, objectKey);
    } catch (err: any) {
      this.logger.error(`Failed to retrieve prescription from MinIO: ${objectKey}`, err.stack);
      throw new InternalServerErrorException(
        'Unable to retrieve prescription file from secure storage.',
      );
    }
  }

  async getPrescriptionBuffer(objectKey: string): Promise<Buffer> {
    const stream = await this.getPrescriptionStream(objectKey);
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async deletePrescriptionFile(objectKey: string): Promise<void> {
    try {
      await this.client.removeObject(this.prescriptionBucket, objectKey);
      this.logger.log(`Deleted prescription file from MinIO: ${objectKey}`);
    } catch (err: any) {
      this.logger.warn(
        `Failed to delete prescription file from MinIO: ${objectKey} - ${err.message}`,
      );
    }
  }
}
