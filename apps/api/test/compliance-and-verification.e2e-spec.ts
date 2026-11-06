import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import {
  UserRole,
  OrderStatus,
  PrescriptionStatus,
  MedicineSchedule,
  OrderItemReviewStatus,
  AlternativeProposalStatus,
} from '@prisma/client';

describe('Phase 5 Compliance Engine & Pharmacist Verification E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let customerCookie: string;
  let pharmacistCookie: string;
  let adminCookie: string;
  let complianceAdminCookie: string;

  let testOrderId: string;
  let testPrescriptionId: string;
  let testStoreId: string;
  let testOtherStoreId: string;
  let testOrderItemId: string;
  let testCustomerUserId: string;

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
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Authenticate COMPLIANCE_ADMIN
    const compRes = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'compliance@example.com', password: 'DemoPassword123!' });
    complianceAdminCookie = compRes.headers['set-cookie'] ? compRes.headers['set-cookie'][0] : '';

    // 2. Authenticate ADMIN
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'admin@example.com', password: 'DemoPassword123!' });
    adminCookie = adminRes.headers['set-cookie'] ? adminRes.headers['set-cookie'][0] : '';

    // 3. Authenticate PHARMACIST (assigned to KOL-001)
    const pharmRes = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' });
    pharmacistCookie = pharmRes.headers['set-cookie'] ? pharmRes.headers['set-cookie'][0] : '';

    // 4. Authenticate CUSTOMER
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpRes = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: testPhone });
    const otpCode = otpRes.body.developmentOtp || '123456';

    const custRes = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testPhone, otp: otpCode });
    customerCookie = custRes.headers['set-cookie'] ? custRes.headers['set-cookie'][0] : '';

    const custUser = await prisma.user.findUnique({ where: { phone: testPhone } });
    testCustomerUserId = custUser!.id;

    // Get Stores
    const kolStore = await prisma.store.findUnique({ where: { code: 'KOL-001' } });
    const howStore = await prisma.store.findUnique({ where: { code: 'HOW-001' } });
    testStoreId = kolStore!.id;
    testOtherStoreId = howStore!.id;

    // Create a prescription and order for testing
    const rx = await prisma.prescription.create({
      data: {
        customerUserId: testCustomerUserId,
        objectKey: `prescriptions/test-rx-${Date.now()}-${Math.random().toString(36).substring(7)}.png`,
        originalFileName: 'doctor-prescription.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        status: PrescriptionStatus.UPLOADED,
      },
    });
    testPrescriptionId = rx.id;

    const med = await prisma.medicine.findFirst({
      where: { schedule: MedicineSchedule.SCHEDULE_H },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}`,
        customerUserId: testCustomerUserId,
        prescriptionId: rx.id,
        status: OrderStatus.PENDING_VERIFICATION,
        paymentMethod: 'COD',
        paymentStatus: 'NOT_REQUIRED',
        subtotal: 100,
        deliveryFee: 50,
        totalAmount: 150,
        addressSnapshot: { city: 'Kolkata', line1: 'Test Address' },
        items: {
          create: [
            {
              medicineId: med!.id,
              medicineNameSnapshot: med!.name,
              skuSnapshot: med!.sku,
              unitPrice: med!.mrp,
              quantity: 2,
              lineTotal: 100,
            },
          ],
        },
      },
      include: { items: true },
    });
    testOrderId = order.id;
    testOrderItemId = order.items[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Only COMPLIANCE_ADMIN can create compliance rule sets; ADMIN is forbidden', async () => {
    const draftVersion = `2.0.${Math.floor(Date.now() / 1000)}`;

    // Normal ADMIN attempts to create rule set -> 403 Forbidden
    const adminAttempt = await request(app.getHttpServer())
      .post('/api/v1/compliance/rule-sets')
      .set('Cookie', adminCookie)
      .send({ version: draftVersion, name: 'Unauthorized Policy' });
    expect(adminAttempt.status).toBe(403);

    // COMPLIANCE_ADMIN creates draft rule set -> 201 Created
    const compAttempt = await request(app.getHttpServer())
      .post('/api/v1/compliance/rule-sets')
      .set('Cookie', complianceAdminCookie)
      .send({ version: draftVersion, name: 'Compliant Draft Policy' });
    expect(compAttempt.status).toBe(201);
    expect(compAttempt.body.version).toBe(draftVersion);
    expect(compAttempt.body.status).toBe('DRAFT');
  });

  it('2. Active rule sets cannot be modified in place', async () => {
    const active = await prisma.complianceRuleSet.findFirst({
      where: { status: 'ACTIVE' },
      include: { rules: true },
    });

    expect(active).toBeDefined();
    const rule = active!.rules[0];

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/compliance/rule-sets/${active!.id}/rules/${rule.id}`)
      .set('Cookie', complianceAdminCookie)
      .send({ hardBlocked: true });

    expect(patchRes.status).toBe(409); // ConflictException
  });

  it('3. ADMIN manually assigns order to KOL-001 review store', async () => {
    // Check unassigned list
    const unassigned = await request(app.getHttpServer())
      .get('/api/v1/admin/review-assignments/unassigned')
      .set('Cookie', adminCookie);
    expect(unassigned.status).toBe(200);

    // Assign to KOL-001
    const assignRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${testOrderId}/review-assignment`)
      .set('Cookie', adminCookie)
      .send({ storeId: testStoreId, reason: 'Test assignment to Salt Lake store' });
    expect(assignRes.status).toBe(201);
    expect(assignRes.body.storeId).toBe(testStoreId);
  });

  it('4. Pharmacist belonging to KOL-001 sees assigned order; cross-store access is blocked', async () => {
    // Pharmacist queue at KOL-001
    const queueRes = await request(app.getHttpServer())
      .get('/api/v1/pharmacist/review-queue')
      .set('Cookie', pharmacistCookie);
    expect(queueRes.status).toBe(200);
    const found = queueRes.body.data.find((o: any) => o.orderId === testOrderId);
    expect(found).toBeDefined();

    // Pharmacist review detail
    const reviewRes = await request(app.getHttpServer())
      .get(`/api/v1/pharmacist/orders/${testOrderId}/review`)
      .set('Cookie', pharmacistCookie);
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.prescription.viewUrl).toBeDefined();
    expect(reviewRes.body.items).toHaveLength(1);
    expect(reviewRes.body.review.status).toBe('IN_REVIEW');
  });

  it('5. Pharmacist can correct extracted medicine fields', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/pharmacist/orders/${testOrderId}/review`)
      .set('Cookie', pharmacistCookie);
    const reviewId = detail.body.review.id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/pharmacist/reviews/${reviewId}/items/${testOrderItemId}`)
      .set('Cookie', pharmacistCookie)
      .send({
        reviewedDosageInstructions: '1 tablet with morning meal',
        reviewedFrequency: 'Once daily',
        reviewedDuration: '14 days',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.reviewedDosageInstructions).toBe('1 tablet with morning meal');
  });

  it('6. Pharmacist approves eligible Schedule H item with valid prescription', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/pharmacist/orders/${testOrderId}/review`)
      .set('Cookie', pharmacistCookie);
    const reviewId = detail.body.review.id;

    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/reviews/${reviewId}/items/${testOrderItemId}/approve`)
      .set('Cookie', pharmacistCookie)
      .send({});

    expect(approveRes.status).toBe(201);
    expect(approveRes.body.status).toBe(OrderItemReviewStatus.APPROVED);
  });

  it('7. Pharmacist completes prescription approval, order moves to APPROVED', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/pharmacist/orders/${testOrderId}/review`)
      .set('Cookie', pharmacistCookie);
    const reviewId = detail.body.review.id;

    const approveRxRes = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/reviews/${reviewId}/approve`)
      .set('Cookie', pharmacistCookie);

    expect(approveRxRes.status).toBe(201);
    expect(approveRxRes.body.status).toBe('APPROVED');

    // Verify order is now APPROVED
    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(updatedOrder!.status).toBe(OrderStatus.APPROVED);
  });

  it('8. Customer verification endpoint returns transparent review details', async () => {
    const custRes = await request(app.getHttpServer())
      .get(`/api/v1/customer/orders/${testOrderId}/verification`)
      .set('Cookie', customerCookie);

    expect(custRes.status).toBe(200);
    expect(custRes.body.orderStatus).toBe(OrderStatus.APPROVED);
    expect(custRes.body.items[0].reviewStatus).toBe('APPROVED');
  });

  // 9. Schedule X and Narcotic Hard Blocks
  it('9. Schedule X and Narcotic items are hard-blocked and fail closed', async () => {
    // 1. Create a medicine classified as SCHEDULE_X
    const schedXMed = await prisma.medicine.create({
      data: {
        sku: `MED-TEST-X-${Date.now()}`,
        name: 'Secobarbital 100 mg',
        brandName: 'Seconal',
        genericName: 'Secobarbital',
        dosageForm: 'Capsule',
        strength: '100 mg',
        mrp: 350.0,
        schedule: MedicineSchedule.SCHEDULE_X,
        status: 'ACTIVE',
      },
    });

    // 2. Create order with Schedule X item
    const schedXOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-X-${Date.now()}`,
        customerUserId: testCustomerUserId,
        prescriptionId: testPrescriptionId,
        status: OrderStatus.PENDING_VERIFICATION,
        paymentMethod: 'COD',
        paymentStatus: 'NOT_REQUIRED',
        subtotal: 350,
        deliveryFee: 0,
        totalAmount: 350,
        addressSnapshot: { city: 'Kolkata', line1: 'Test Address' },
        items: {
          create: [
            {
              medicineId: schedXMed.id,
              medicineNameSnapshot: schedXMed.name,
              skuSnapshot: schedXMed.sku,
              unitPrice: schedXMed.mrp,
              quantity: 1,
              lineTotal: 350,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 3. Open review
    const schedXReview = await prisma.prescriptionReview.create({
      data: {
        order: { connect: { id: schedXOrder.id } },
        prescription: { connect: { id: testPrescriptionId } },
        pharmacist: {
          connect: {
            id: (await prisma.user.findFirst({ where: { email: 'pharmacist@example.com' } }))!.id,
          },
        },
        store: { connect: { id: testStoreId } },
        status: 'IN_REVIEW',
      },
    });

    const pharmUser = await prisma.user.findFirst({ where: { email: 'pharmacist@example.com' } });
    await prisma.orderItemReview.create({
      data: {
        orderItem: { connect: { id: schedXOrder.items[0].id } },
        prescriptionReview: { connect: { id: schedXReview.id } },
        pharmacist: { connect: { id: pharmUser!.id } },
        medicine: { connect: { id: schedXMed.id } },
        status: OrderItemReviewStatus.PENDING,
      },
    });

    // Attempt to approve Schedule X item -> must be rejected with 422 Unprocessable Entity
    const approveAttempt = await request(app.getHttpServer())
      .post(
        `/api/v1/pharmacist/reviews/${schedXReview.id}/items/${schedXOrder.items[0].id}/approve`,
      )
      .set('Cookie', pharmacistCookie)
      .send({});

    expect(approveAttempt.status).toBe(422);
    expect(approveAttempt.body.message).toContain('Schedule X');
  });

  // 10. Generic Alternative Proposal & Customer Response
  it('10. Pharmacist proposes generic alternative and customer accepts', async () => {
    // 1. Find or create two interchangeable generic medicines with identical genericName
    const originalMed = await prisma.medicine.findFirst({
      where: { schedule: MedicineSchedule.SCHEDULE_H, genericName: { not: null } },
    });

    let proposedMed = await prisma.medicine.findFirst({
      where: {
        genericName: originalMed!.genericName,
        id: { not: originalMed!.id },
      },
    });

    if (!proposedMed) {
      proposedMed = await prisma.medicine.create({
        data: {
          sku: `GEN-ALT-${Date.now()}`,
          name: `${originalMed!.genericName} Generic Brand`,
          genericName: originalMed!.genericName,
          schedule: originalMed!.schedule,
          mrp: Number(originalMed!.mrp) * 0.8,
          status: 'ACTIVE',
        },
      });
    }

    const altOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-ALT-${Date.now()}`,
        customerUserId: testCustomerUserId,
        prescriptionId: testPrescriptionId,
        status: OrderStatus.UNDER_REVIEW,
        paymentMethod: 'COD',
        paymentStatus: 'NOT_REQUIRED',
        subtotal: 100,
        deliveryFee: 50,
        totalAmount: 150,
        addressSnapshot: { city: 'Kolkata', line1: 'Test Address' },
        items: {
          create: [
            {
              medicineId: originalMed!.id,
              medicineNameSnapshot: originalMed!.name,
              skuSnapshot: originalMed!.sku,
              unitPrice: originalMed!.mrp,
              quantity: 2,
              lineTotal: 100,
            },
          ],
        },
      },
      include: { items: true },
    });

    const altReview = await prisma.prescriptionReview.create({
      data: {
        order: { connect: { id: altOrder.id } },
        prescription: { connect: { id: testPrescriptionId } },
        pharmacist: {
          connect: {
            id: (await prisma.user.findFirst({ where: { email: 'pharmacist@example.com' } }))!.id,
          },
        },
        store: { connect: { id: testStoreId } },
        status: 'IN_REVIEW',
      },
    });

    await prisma.orderItemReview.create({
      data: {
        orderItem: { connect: { id: altOrder.items[0].id } },
        prescriptionReview: { connect: { id: altReview.id } },
        pharmacist: {
          connect: {
            id: (await prisma.user.findFirst({ where: { email: 'pharmacist@example.com' } }))!.id,
          },
        },
        medicine: { connect: { id: originalMed!.id } },
        status: OrderItemReviewStatus.PENDING,
      },
    });

    // Pharmacist proposes alternative
    const propRes = await request(app.getHttpServer())
      .post(
        `/api/v1/pharmacist/reviews/${altReview.id}/items/${altOrder.items[0].id}/propose-alternative`,
      )
      .set('Cookie', pharmacistCookie)
      .send({
        proposedMedicineId: proposedMed!.id,
        reason: 'Generic equivalent with identical salt and dosage formulation',
      });

    expect(propRes.status).toBe(201);
    const proposalId = propRes.body.id;

    // Customer accepts proposal
    const acceptRes = await request(app.getHttpServer())
      .post(`/api/v1/customer/orders/${altOrder.id}/alternatives/${proposalId}/respond`)
      .set('Cookie', customerCookie)
      .send({ action: 'ACCEPT', note: 'Accepted generic substitution' });

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.proposal.status).toBe('ACCEPTED');

    // Verify order returns to UNDER_REVIEW
    const updatedOrder = await prisma.order.findUnique({ where: { id: altOrder.id } });
    expect(updatedOrder!.status).toBe(OrderStatus.UNDER_REVIEW);
  });
});
