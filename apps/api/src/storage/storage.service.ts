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

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    try {
      const exists = await this.client.bucketExists(this.importBucket);
      if (!exists) {
        await this.client.makeBucket(this.importBucket, 'us-east-1');
        this.logger.log(`Created private MinIO bucket '${this.importBucket}'`);
      } else {
        this.logger.log(`MinIO bucket '${this.importBucket}' ready`);
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
}
