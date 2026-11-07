import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  OrderStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  StockReservationStatus,
  HandoverType,
} from '@prisma/client';

describe('Refill Automation & Admin Analytics E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let customerCookie: string;
  let adminCookie: string;
  let pharmacistCookie: string;

  let customerUserId: string;
  let pharmacistUserId: string;
  let storeId: string;
  let medicineId: string;
  let orderId: string;
  let orderItemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // 1. Fetch or create store
    const store = await prisma.store.findFirst({ where: { status: 'ACTIVE' } });
    storeId = store!.id;

    // 2. Fetch or create medicine (e.g. Paracetamol / Metformin)
    const med = await prisma.medicine.findFirst({
      where: { status: 'ACTIVE', name: { contains: 'Metformin' } },
    });
    medicineId = med!.id;

    // 3. Customer Login (OTP with fresh randomized phone to avoid rate limit)
    const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpRes = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone })
      .expect(200);

    const otpCode = otpRes.body.developmentOtp || '123456';
    const custLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone, otp: otpCode })
      .expect(200);

    const custCookies = custLoginRes.headers['set-cookie'] as unknown as string[];
    customerCookie = Array.isArray(custCookies) ? custCookies[0].split(';')[0] : '';
    const custUser = await prisma.user.findUnique({ where: { phone } });
    customerUserId = custUser!.id;

    // 4. Pharmacist Login
    const pharmLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' })
      .expect(200);

    const pharmCookies = pharmLoginRes.headers['set-cookie'] as unknown as string[];
    pharmacistCookie = Array.isArray(pharmCookies) ? pharmCookies[0].split(';')[0] : '';
    const pharmaUser = await prisma.user.findUnique({ where: { email: 'pharmacist@example.com' } });
    pharmacistUserId = pharmaUser!.id;

    // 5. Admin Login
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'admin@example.com', password: 'DemoPassword123!' })
      .expect(200);

    const adminCookies = adminLoginRes.headers['set-cookie'] as unknown as string[];
    adminCookie = Array.isArray(adminCookies) ? adminCookies[0].split(';')[0] : '';

    // 6. Seed Address, Prescription and Handed-Over Order with Pharmacist-Verified Dosage
    let address = await prisma.customerAddress.findFirst({
      where: { customerUserId },
    });

    if (!address) {
      address = await prisma.customerAddress.create({
        data: {
          customerUserId,
          label: 'Home',
          recipientName: 'Test Recipient',
          phone,
          addressLine1: 'Block CA, Sector 1, Salt Lake',
          city: 'Kolkata',
          state: 'West Bengal',
          postalCode: '700064',
          latitude: 22.585,
          longitude: 88.415,
        },
      });
    }

    const rx = await prisma.prescription.create({
      data: {
        customerUserId,
        objectKey: `prescriptions/e2e-refill-test-${Date.now()}.pdf`,
        originalFileName: 'e2e-refill-test.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        status: 'APPROVED',
      },
    });

    const orderNumber = `E2E-REF-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerUserId,
        prescriptionId: rx.id,
        addressId: address!.id,
        status: OrderStatus.READY_FOR_HANDOVER,
        fulfilmentStoreId: storeId,
        paymentMethod: OrderPaymentMethod.COD,
        paymentStatus: OrderPaymentStatus.PENDING,
        subtotal: 100,
        totalAmount: 140,
        deliveryFee: 40,
        discount: 0,
        addressSnapshot: {
          recipientName: 'Test Recipient',
          phone,
          addressLine1: 'Test Address',
          city: 'Kolkata',
          state: 'West Bengal',
          postalCode: '700001',
        },
        items: {
          create: [
            {
              medicineId,
              medicineNameSnapshot: med!.name,
              skuSnapshot: med!.sku,
              unitPrice: 100,
              quantity: 60, // 60 tablets dispensed
              lineTotal: 100,
              status: 'APPROVED',
            },
          ],
        },
      },
      include: { items: true },
    });

    orderId = order.id;
    orderItemId = order.items[0].id;

    // Create PrescriptionReview & Pharmacist-Verified OrderItemReview with confirmed dosage
    const review = await prisma.prescriptionReview.create({
      data: {
        orderId: order.id,
        prescriptionId: rx.id,
        pharmacistId: pharmacistUserId,
        storeId,
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    });

    await prisma.orderItemReview.create({
      data: {
        orderItemId,
        prescriptionReviewId: review.id,
        pharmacistId: pharmacistUserId,
        medicineId,
        status: 'APPROVED',
        reviewedQuantity: 60,
        unitsPerAdministration: 1, // 1 tablet
        administrationsPerDay: 2, // 2 times a day -> 2/day -> 30 days
        verifiedDosageUnit: 'TABLET',
        verifiedDosageConfirmed: true,
        reviewedDosageInstructions: '1 tablet twice daily after meals',
        decisionReason: 'Verified with prescription',
        reviewedAt: new Date(),
      },
    });

    // Ensure store has at least 100 units of physical stock for handover decrement test
    await prisma.inventoryBalance.upsert({
      where: {
        medicineId_storeId: {
          medicineId,
          storeId,
        },
      },
      update: {
        quantity: 100,
      },
      create: {
        medicineId,
        storeId,
        quantity: 100,
      },
    });

    // Create reservation for handover decrement test
    await prisma.stockReservation.create({
      data: {
        orderId: order.id,
        storeId,
        medicineId,
        orderItemId,
        quantity: 60,
        status: StockReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Physical handover automatically triggers RefillEstimate generation for verified item', async () => {
    // Perform handover via pharmacist endpoint
    await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${orderId}/handover`)
      .set('Cookie', pharmacistCookie)
      .send({
        handoverType: HandoverType.DELIVERY_PARTNER,
        recipientName: 'Test Recipient',
        deliveryPartnerName: 'Shadowfax Express',
        referenceNumber: 'AWB-998877',
      })
      .expect(201);

    // Verify order is now HANDED_OVER
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(updatedOrder?.status).toBe(OrderStatus.HANDED_OVER);

    // Check that RefillEstimate was created in DB
    const estimate = await prisma.refillEstimate.findFirst({
      where: { orderItemId },
    });

    expect(estimate).toBeDefined();
    expect(estimate?.eligibilityStatus).toBe('ELIGIBLE');
    expect(Number(estimate?.dispensedQuantity)).toBe(60);
    expect(Number(estimate?.dailyConsumption)).toBe(2);
    expect(Number(estimate?.estimatedSupplyDays)).toBe(30);
    expect(estimate?.estimatedRunOutAt).toBeDefined();
  });

  it('2. Customer can view refill estimates in customer portal', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customer/refills')
      .set('Cookie', customerCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const est = res.body.find((e: any) => e.orderItemId === orderItemId);
    expect(est).toBeDefined();
    expect(est.eligibilityStatus).toBe('ELIGIBLE');
    expect(est.estimatedSupplyDays).toBe(30);
    expect(est.daysRemaining).toBeGreaterThan(0);
  });

  let subscriptionId: string;

  it('3. Customer can explicitly opt in to refill reminders', async () => {
    const estimates = await prisma.refillEstimate.findMany({
      where: { orderItemId },
    });
    const estId = estimates[0].id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/customer/refills/subscriptions')
      .set('Cookie', customerCookie)
      .send({
        refillEstimateId: estId,
        reminderDaysBefore: 5,
        preferredNotificationChannel: 'IN_APP',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('ACTIVE');
    subscriptionId = res.body.id;

    // Check reminder record was created
    const reminder = await prisma.refillReminder.findFirst({
      where: { subscriptionId },
    });
    expect(reminder).toBeDefined();
    expect(reminder?.status).toBe('SCHEDULED');
  });

  it('4. Customer can pause and resume refill reminders', async () => {
    // Pause
    const pauseRes = await request(app.getHttpServer())
      .post(`/api/v1/customer/refills/subscriptions/${subscriptionId}/pause`)
      .set('Cookie', customerCookie)
      .expect(201);

    expect(pauseRes.body.status).toBe('PAUSED');

    // Resume
    const resumeRes = await request(app.getHttpServer())
      .post(`/api/v1/customer/refills/subscriptions/${subscriptionId}/resume`)
      .set('Cookie', customerCookie)
      .expect(201);

    expect(resumeRes.body.status).toBe('ACTIVE');
  });

  it('5. One-tap reorder pre-fills customer cart without bypassing payment or checkout', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customer/refills/subscriptions/${subscriptionId}/reorder`)
      .set('Cookie', customerCookie)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.quantity).toBe(60);

    // Verify item is now in customer's cart
    const cartRes = await request(app.getHttpServer())
      .get('/api/v1/customer/cart')
      .set('Cookie', customerCookie)
      .expect(200);

    expect(cartRes.body.items.length).toBeGreaterThan(0);
    const item = cartRes.body.items.find((i: any) => i.medicine.id === medicineId);
    expect(item).toBeDefined();
    expect(item.quantity).toBe(60);
  });

  it('6. Admin Analytics Overview returns aggregated database metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/overview?period=30D')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.totalOrders).toBeGreaterThan(0);
    expect(res.body.handedOverOrders).toBeGreaterThan(0);
    expect(res.body.activeStoresCount).toBeGreaterThan(0);
    expect(res.body.activeRefillSubscriptionsCount).toBeGreaterThan(0);
  });

  it('7. Admin Analytics Verification calculates median time and rejections', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/verification?period=30D')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.totalPrescriptionsReviewed).toBeGreaterThan(0);
    expect(res.body.approvedCount).toBeGreaterThan(0);
    expect(typeof res.body.medianVerificationMinutes).toBe('number');
  });

  it('8. Admin Analytics Refills returns subscription counts and conversion funnel', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/refills?period=30D')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.activeSubscriptions).toBeGreaterThan(0);
    expect(res.body.estimatesGenerated).toBeGreaterThan(0);
    expect(typeof res.body.conversionRatePercentage).toBe('number');
  });
});
