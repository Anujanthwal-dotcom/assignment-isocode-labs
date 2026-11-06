import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { PrescriptionAIStatus, PrescriptionStatus } from '@prisma/client';
import { PrescriptionAiProcessor } from '../src/prescription-ai/prescription-ai.processor';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PRESCRIPTION_AI_QUEUE } from '../src/prescription-ai/prescription-ai.service';

describe('Phase 4 AI-Assisted Prescription Reading E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let processor: PrescriptionAiProcessor;
  let queue: Queue;

  let customer1Cookie: string;
  let customer1Id: string;
  let customer2Cookie: string;

  let prescriptionId: string;
  let unreadablePrescriptionId: string;
  let extractionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    processor = app.get<PrescriptionAiProcessor>(PrescriptionAiProcessor);
    queue = app.get<Queue>(getQueueToken(PRESCRIPTION_AI_QUEUE));

    // Pause worker auto-consumption for deterministic state testing
    await queue.pause();

    // Setup Customer 1
    const phone1 = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otp1 =
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/customer/request-otp')
          .send({ phone: phone1 })
      ).body.developmentOtp || '123456';

    const login1 = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: phone1, otp: otp1 });
    customer1Cookie = login1.headers['set-cookie'] ? login1.headers['set-cookie'][0] : '';
    customer1Id = login1.body.id;

    // Setup Customer 2
    const phone2 = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otp2 =
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/customer/request-otp')
          .send({ phone: phone2 })
      ).body.developmentOtp || '123456';

    const login2 = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: phone2, otp: otp2 });
    customer2Cookie = login2.headers['set-cookie'] ? login2.headers['set-cookie'][0] : '';

    // Upload standard readable prescription for Customer 1
    const validJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
    ]);

    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/customer/prescriptions')
      .set('Cookie', customer1Cookie)
      .attach('file', validJpeg, 'doctor-rx-readable.jpg');
    expect(uploadRes.status).toBe(201);
    prescriptionId = uploadRes.body.id;

    // Upload unreadable prescription for Customer 1
    const unreadableUpload = await request(app.getHttpServer())
      .post('/api/v1/customer/prescriptions')
      .set('Cookie', customer1Cookie)
      .attach('file', validJpeg, 'blurry-unreadable-scan.jpg');
    expect(unreadableUpload.status).toBe(201);
    unreadablePrescriptionId = unreadableUpload.body.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    const ids = [prescriptionId, unreadablePrescriptionId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.prescriptionAIExtraction.deleteMany({
        where: { prescriptionId: { in: ids } },
      });
      await prisma.prescription.deleteMany({
        where: { id: { in: ids } },
      });
    }
    await app.close();
  });

  it('1. Customer can request extraction for their uploaded prescription (202 Accepted)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${prescriptionId}/extractions`)
      .set('Cookie', customer1Cookie)
      .send({});

    expect(res.status).toBe(202);
    expect(res.body.prescriptionId).toBe(prescriptionId);
    expect(res.body.status).toBe('QUEUED');
    expect(res.body.attemptNumber).toBe(1);
    expect(res.body.extractionId).toBeDefined();

    extractionId = res.body.extractionId;
  });

  it('2. Another customer cannot request extraction on a prescription they do not own (404/403)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${prescriptionId}/extractions`)
      .set('Cookie', customer2Cookie)
      .send({});

    expect(res.status).toBe(404);
  });

  it('3. Prevents duplicate active extraction request (409 Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${prescriptionId}/extractions`)
      .set('Cookie', customer1Cookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already in progress');
  });

  it('4. BullMQ processor processes the extraction and marks COMPLETED with catalogue match', async () => {
    // Reset to PROCESSING or invoke processor directly
    await processor.process({
      id: 'test-job-1',
      data: {
        extractionId,
        prescriptionId,
        customerUserId: customer1Id,
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as any);

    // Verify extraction state in DB
    const record = await prisma.prescriptionAIExtraction.findUnique({
      where: { id: extractionId },
    });

    expect(record).toBeDefined();
    expect(record?.status).toBe(PrescriptionAIStatus.COMPLETED);
    expect(record?.documentReadable).toBe(true);
    expect(Number(record?.overallConfidence)).toBeGreaterThan(0.8);
    expect(record?.extractionResult).toBeDefined();
    expect(record?.matchingResult).toBeDefined();
  });

  it('5. Customer can retrieve latest extraction status and catalogue matching draft', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/prescriptions/${prescriptionId}/extractions/latest`)
      .set('Cookie', customer1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(extractionId);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.extractionResult.items.length).toBeGreaterThan(0);
    expect(res.body.matchingResult).toBeDefined();
    expect(res.body.matchingResult[0].selectedMedicineId).toBeDefined();
  });

  it('6. Customer can view extraction by ID, other customer cannot', async () => {
    // Owner can access
    const res = await request(app.getHttpServer())
      .get(`/api/v1/prescriptions/${prescriptionId}/extractions/${extractionId}`)
      .set('Cookie', customer1Cookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(extractionId);

    // Other customer cannot access
    const forbiddenRes = await request(app.getHttpServer())
      .get(`/api/v1/prescriptions/${prescriptionId}/extractions/${extractionId}`)
      .set('Cookie', customer2Cookie);
    expect(forbiddenRes.status).toBe(404);
  });

  it('7. Unreadable prescription transitions to NEEDS_REUPLOAD', async () => {
    // Request extraction for unreadable prescription
    const reqRes = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${unreadablePrescriptionId}/extractions`)
      .set('Cookie', customer1Cookie)
      .send({ mockFixture: 'unreadable' });
    expect(reqRes.status).toBe(202);

    const unreadableExtId = reqRes.body.extractionId;

    // Process job
    await processor.process({
      id: 'test-job-unreadable',
      data: {
        extractionId: unreadableExtId,
        prescriptionId: unreadablePrescriptionId,
        customerUserId: customer1Id,
        fixtureHint: 'unreadable',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as any);

    // Check status
    const record = await prisma.prescriptionAIExtraction.findUnique({
      where: { id: unreadableExtId },
    });
    expect(record?.status).toBe(PrescriptionAIStatus.NEEDS_REUPLOAD);
    expect(record?.documentReadable).toBe(false);

    // Prescription status remains UPLOADED (not approved or rejected by AI)
    const rx = await prisma.prescription.findUnique({
      where: { id: unreadablePrescriptionId },
    });
    expect(rx?.status).toBe(PrescriptionStatus.UPLOADED);
  });

  it('8. Customer can retry unreadable extraction, creating a new attempt record', async () => {
    const latestUnreadable = await prisma.prescriptionAIExtraction.findFirst({
      where: { prescriptionId: unreadablePrescriptionId },
      orderBy: { attemptNumber: 'desc' },
    });

    const retryRes = await request(app.getHttpServer())
      .post(
        `/api/v1/prescriptions/${unreadablePrescriptionId}/extractions/${latestUnreadable!.id}/retry`,
      )
      .set('Cookie', customer1Cookie)
      .send({});

    expect(retryRes.status).toBe(202);
    expect(retryRes.body.attemptNumber).toBe(2);
    expect(retryRes.body.status).toBe('QUEUED');
    expect(retryRes.body.extractionId).not.toBe(latestUnreadable!.id);
  });
});
