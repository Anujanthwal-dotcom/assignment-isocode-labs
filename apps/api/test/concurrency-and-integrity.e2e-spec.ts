import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { StockReservationService } from '../src/order-routing/stock-reservation.service';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { OrderStatus, OrderPaymentMethod, MedicineSchedule, HandoverType } from '@prisma/client';

describe('Phase 8 Data Integrity and Concurrency E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reservationService: StockReservationService;
  let customerACookie: string;
  let customerBCookie: string;
  let pharmacistCookie: string;
  let userAId: string;
  let userBId: string;
  let testStoreId: string;
  let limitedMedicineId: string;

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
    reservationService = app.get<StockReservationService>(StockReservationService);

    // Customer A
    const phoneA = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpA =
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/customer/request-otp')
          .send({ phone: phoneA })
      ).body.developmentOtp || '123456';
    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: phoneA, otp: otpA });
    customerACookie = loginA.headers['set-cookie'][0];
    const userA = await prisma.user.findFirst({ where: { phone: phoneA } });
    userAId = userA!.id;

    // Customer B
    const phoneB = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpB =
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/customer/request-otp')
          .send({ phone: phoneB })
      ).body.developmentOtp || '123456';
    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: phoneB, otp: otpB });
    customerBCookie = loginB.headers['set-cookie'][0];
    const userB = await prisma.user.findFirst({ where: { phone: phoneB } });
    userBId = userB!.id;

    // Pharmacist
    const pharmLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' });
    pharmacistCookie = pharmLogin.headers['set-cookie'][0];

    // Find Pharmacist's Store
    const profile = await prisma.pharmacistProfile.findFirst({
      where: { user: { email: 'pharmacist@example.com' } },
    });
    testStoreId = profile!.storeId;

    // Create a medicine with limited stock (exact quantity = 1) for concurrency test
    const med = await prisma.medicine.create({
      data: {
        sku: `MED-LTD-${Date.now()}`,
        name: 'Limited Availability Medicine 10mg',
        schedule: MedicineSchedule.SCHEDULE_H,
        dosageForm: 'Tablet',
        strength: '10mg',
        mrp: 120.0,
        status: 'ACTIVE',
      },
    });
    limitedMedicineId = med.id;

    // Set physical stock = 1 in inventory_balances
    await prisma.inventoryBalance.upsert({
      where: {
        medicineId_storeId: {
          medicineId: limitedMedicineId,
          storeId: testStoreId,
        },
      },
      update: { quantity: 1 },
      create: {
        medicineId: limitedMedicineId,
        storeId: testStoreId,
        quantity: 1,
      },
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Two concurrent reservation requests for the last available unit: one succeeds, one fails (no overselling)', async () => {
    const rx = await prisma.prescription.create({
      data: {
        customerUserId: userAId,
        objectKey: `prescriptions/test-conc-${Date.now()}.png`,
        originalFileName: 'rx-conc.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        status: 'UPLOADED',
      },
    });

    // Create 2 distinct orders competing for the same single unit
    const order1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-C1-${Date.now()}`,
        customerUserId: userAId,
        prescriptionId: rx.id,
        status: OrderStatus.APPROVED,
        paymentMethod: OrderPaymentMethod.COD,
        paymentStatus: 'NOT_REQUIRED',
        subtotal: 120,
        deliveryFee: 0,
        totalAmount: 120,
        addressSnapshot: { line1: 'Test St' },
        items: {
          create: [
            {
              medicineId: limitedMedicineId,
              medicineNameSnapshot: 'Limited Availability',
              skuSnapshot: 'LTD-1',
              unitPrice: 120,
              quantity: 1,
              lineTotal: 120,
            },
          ],
        },
      },
      include: { items: true },
    });

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-C2-${Date.now()}`,
        customerUserId: userBId,
        prescriptionId: rx.id,
        status: OrderStatus.APPROVED,
        paymentMethod: OrderPaymentMethod.COD,
        paymentStatus: 'NOT_REQUIRED',
        subtotal: 120,
        deliveryFee: 0,
        totalAmount: 120,
        addressSnapshot: { line1: 'Test St' },
        items: {
          create: [
            {
              medicineId: limitedMedicineId,
              medicineNameSnapshot: 'Limited Availability',
              skuSnapshot: 'LTD-1',
              unitPrice: 120,
              quantity: 1,
              lineTotal: 120,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Execute 2 concurrent reservation attempts using Promise.all
    const [res1, res2] = await Promise.all([
      reservationService.reserveStockForOrder(order1.id, testStoreId, [
        { orderItemId: order1.items[0].id, medicineId: limitedMedicineId, quantity: 1 },
      ]),
      reservationService.reserveStockForOrder(order2.id, testStoreId, [
        { orderItemId: order2.items[0].id, medicineId: limitedMedicineId, quantity: 1 },
      ]),
    ]);

    // Exactly one must succeed and one must fail
    const successes = [res1, res2].filter((r) => r.success);
    const failures = [res1, res2].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].failureReason).toContain('Insufficient stock');

    // Physical stock remains unchanged at 1 (reservations are virtual holds until handover)
    const bal = await prisma.inventoryBalance.findUnique({
      where: {
        medicineId_storeId: {
          medicineId: limitedMedicineId,
          storeId: testStoreId,
        },
      },
    });
    expect(bal!.quantity).toBe(1);

    // Active reservation count is exactly 1
    const activeResCount = await prisma.stockReservation.count({
      where: {
        medicineId: limitedMedicineId,
        storeId: testStoreId,
        status: 'ACTIVE',
      },
    });
    expect(activeResCount).toBe(1);
  });

  it('2. Duplicate payment callbacks do not create duplicate success or duplicate ledger records', async () => {
    // Create test order
    const rx = await prisma.prescription.create({
      data: {
        customerUserId: userAId,
        objectKey: `prescriptions/test-pay-${Date.now()}.png`,
        originalFileName: 'rx-pay.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        status: 'UPLOADED',
      },
    });

    const addr = await prisma.customerAddress.create({
      data: {
        customerUserId: userAId,
        label: 'Home',
        recipientName: 'Test Payer',
        phone: '9800000000',
        addressLine1: 'Test St',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700001',
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-PAY-${Date.now()}`,
        customerUserId: userAId,
        prescriptionId: rx.id,
        status: OrderStatus.PENDING_VERIFICATION,
        paymentMethod: OrderPaymentMethod.UPI,
        paymentStatus: 'PENDING',
        subtotal: 120,
        deliveryFee: 0,
        totalAmount: 120,
        addressSnapshot: { line1: 'Test St' },
        payment: {
          create: {
            method: OrderPaymentMethod.UPI,
            status: 'PENDING',
            amount: 120,
          },
        },
      },
    });

    // 1st Callback: SUCCESS
    const pay1 = await request(app.getHttpServer())
      .post(`/api/v1/customer/orders/${order.id}/mock-payment`)
      .set('Cookie', customerACookie)
      .send({ result: 'SUCCESS' })
      .expect(201);

    expect(pay1.body.paymentStatus).toBe('SUCCESS');
    const firstTxnRef = pay1.body.transactionReference;

    // 2nd Callback: Duplicate
    const pay2 = await request(app.getHttpServer())
      .post(`/api/v1/customer/orders/${order.id}/mock-payment`)
      .set('Cookie', customerACookie)
      .send({ result: 'SUCCESS' })
      .expect(201);

    expect(pay2.body.paymentStatus).toBe('SUCCESS');
    expect(pay2.body.transactionReference).toBe(firstTxnRef);
    expect(pay2.body.message).toContain('already successfully completed');

    // Exactly 1 payment record exists for this order
    const payCount = await prisma.orderPayment.count({
      where: { orderId: order.id },
    });
    expect(payCount).toBe(1);
  });

  it('3. Duplicate handover requests: second attempt is rejected with 400', async () => {
    // Seed stock for handover
    const hoMed = await prisma.medicine.create({
      data: {
        sku: `MED-HO-${Date.now()}`,
        name: 'Handover Test Tablet',
        schedule: MedicineSchedule.SCHEDULE_H,
        dosageForm: 'Tablet',
        mrp: 50.0,
        status: 'ACTIVE',
      },
    });

    await prisma.inventoryBalance.create({
      data: {
        storeId: testStoreId,
        medicineId: hoMed.id,
        quantity: 5,
      },
    });

    const rx = await prisma.prescription.create({
      data: {
        customerUserId: userAId,
        objectKey: `prescriptions/test-ho-${Date.now()}.png`,
        originalFileName: 'rx-ho.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        status: 'APPROVED',
      },
    });

    const hoOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-HO-${Date.now()}`,
        customerUserId: userAId,
        prescriptionId: rx.id,
        fulfilmentStoreId: testStoreId,
        status: OrderStatus.READY_FOR_HANDOVER,
        paymentMethod: OrderPaymentMethod.COD,
        paymentStatus: 'NOT_REQUIRED',
        subtotal: 50,
        deliveryFee: 0,
        totalAmount: 50,
        addressSnapshot: { line1: 'Test St' },
        items: {
          create: [
            {
              medicineId: hoMed.id,
              medicineNameSnapshot: hoMed.name,
              skuSnapshot: hoMed.sku,
              unitPrice: 50,
              quantity: 1,
              lineTotal: 50,
            },
          ],
        },
      },
      include: { items: true },
    });

    await prisma.stockReservation.create({
      data: {
        orderId: hoOrder.id,
        orderItemId: hoOrder.items[0].id,
        storeId: testStoreId,
        medicineId: hoMed.id,
        quantity: 1,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // 1st Handover succeeds
    const ho1 = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${hoOrder.id}/handover`)
      .set('Cookie', pharmacistCookie)
      .send({
        handoverType: HandoverType.CUSTOMER_PICKUP,
        recipientName: 'Debasish Ghosh',
        notes: 'Handover complete with verified ID',
      })
      .expect(201);

    expect(ho1.body.id).toBeDefined();
    const updated = await prisma.order.findUnique({ where: { id: hoOrder.id } });
    expect(updated!.status).toBe(OrderStatus.HANDED_OVER);

    // 2nd Handover attempt must fail with 400
    const ho2 = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${hoOrder.id}/handover`)
      .set('Cookie', pharmacistCookie)
      .send({
        handoverType: HandoverType.CUSTOMER_PICKUP,
        recipientName: 'Debasish Ghosh',
      });

    expect(ho2.status).toBe(400);

    // Physical stock decremented exactly once (5 - 1 = 4)
    const finalBalance = await prisma.inventoryBalance.findUnique({
      where: {
        medicineId_storeId: {
          medicineId: hoMed.id,
          storeId: testStoreId,
        },
      },
    });
    expect(finalBalance!.quantity).toBe(4);
  });

  it('4. Repeated OTP requests beyond rate limit: rejected with 429 Too Many Requests', async () => {
    const spamPhone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1st, 2nd, 3rd succeed
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: spamPhone })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: spamPhone })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: spamPhone })
      .expect(200);

    // 4th request must be rate limited with 429
    const rateLimited = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: spamPhone });

    expect(rateLimited.status).toBe(429);
    expect(rateLimited.body.message).toContain('Too many OTP requests');
  });
});
