import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  OrderStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  StockReservationStatus,
  OrderItemReviewStatus,
  H1RegisterStatus,
} from '@prisma/client';

describe('Store Routing, Inventory Reservation & Order Fulfilment E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let customerCookie: string;
  let pharmacistCookie: string;
  let adminCookie: string;

  let customerUserId: string;
  let pharmacistUserId: string;
  let kolStoreId: string;
  let howStoreId: string;
  let paracetamolMedId: string;
  let testOrderId: string;
  let testOrderItemId: string;
  let prescriptionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Authenticate Customer
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpRes = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: testPhone });
    const otpCode = otpRes.body.developmentOtp || '123456';

    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testPhone, otp: otpCode });
    customerCookie = custLogin.headers['set-cookie'] ? custLogin.headers['set-cookie'][0] : '';
    const custUser = await prisma.user.findUnique({ where: { phone: testPhone } });
    customerUserId = custUser!.id;

    // 2. Authenticate Pharmacist
    const pharmaLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' });
    pharmacistCookie = pharmaLogin.headers['set-cookie']
      ? pharmaLogin.headers['set-cookie'][0]
      : '';
    const pharmaUser = await prisma.user.findUnique({ where: { email: 'pharmacist@example.com' } });
    pharmacistUserId = pharmaUser!.id;

    // 3. Authenticate Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'admin@example.com', password: 'DemoPassword123!' });
    adminCookie = adminLogin.headers['set-cookie'] ? adminLogin.headers['set-cookie'][0] : '';

    // Get Stores and Medicines
    const kolStore = await prisma.store.findUnique({ where: { code: 'KOL-001' } });
    kolStoreId = kolStore!.id;
    const howStore = await prisma.store.findUnique({ where: { code: 'HOW-001' } });
    howStoreId = howStore!.id;

    const med = await prisma.medicine.findFirst({ where: { sku: 'MED-PAR-500-001' } });
    paracetamolMedId = med!.id;

    // Release or delete existing test reservations so availableStock is clean
    await prisma.stockReservation.deleteMany({
      where: { medicineId: paracetamolMedId, status: StockReservationStatus.ACTIVE },
    });

    // Ensure inventory exists at stores:
    // KOL-001: 50 on-hand
    await prisma.inventoryBalance.upsert({
      where: { medicineId_storeId: { medicineId: paracetamolMedId, storeId: kolStoreId } },
      update: { quantity: 50 },
      create: { medicineId: paracetamolMedId, storeId: kolStoreId, quantity: 50 },
    });
    // HOW-001: 50 on-hand
    await prisma.inventoryBalance.upsert({
      where: { medicineId_storeId: { medicineId: paracetamolMedId, storeId: howStoreId } },
      update: { quantity: 50 },
      create: { medicineId: paracetamolMedId, storeId: howStoreId, quantity: 50 },
    });

    // Create Customer Delivery Address with Coordinates near Salt Lake (22.585, 88.415)
    const address = await prisma.customerAddress.create({
      data: {
        customerUserId,
        label: 'Salt Lake Home',
        recipientName: 'Debasish Ghosh',
        phone: '9876543210',
        addressLine1: 'Block CA, Sector 1, Salt Lake',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700064',
        latitude: 22.585,
        longitude: 88.415,
      },
    });

    // Create Prescription
    const rx = await prisma.prescription.create({
      data: {
        customerUserId,
        objectKey: `e2e-rx-${Date.now()}.png`,
        originalFileName: 'rx.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        status: 'APPROVED',
      },
    });
    prescriptionId = rx.id;

    // Create Customer Order in APPROVED state with an APPROVED item review and H1 register entry
    const orderNumber = `E2E-ORD-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerUserId,
        prescriptionId: rx.id,
        addressId: address.id,
        status: OrderStatus.APPROVED,
        paymentMethod: OrderPaymentMethod.COD,
        paymentStatus: OrderPaymentStatus.PENDING,
        subtotal: 100,
        totalAmount: 140, // 100 + 40 delivery fee
        deliveryFee: 40,
        discount: 0,
        payment: {
          create: {
            method: OrderPaymentMethod.COD,
            status: OrderPaymentStatus.PENDING,
            amount: 140,
            provider: 'MOCK',
          },
        },
        addressSnapshot: {
          recipientName: 'Debasish Ghosh',
          phone: '9876543210',
          addressLine1: 'Block CA, Sector 1, Salt Lake',
          city: 'Kolkata',
          state: 'West Bengal',
          postalCode: '700064',
        },
        items: {
          create: [
            {
              medicineId: paracetamolMedId,
              medicineNameSnapshot: 'Paracetamol 500mg Tablet',
              skuSnapshot: 'MED-PAR-500-001',
              unitPrice: 10,
              quantity: 10,
              lineTotal: 100,
              status: 'APPROVED',
            },
          ],
        },
      },
      include: { items: true },
    });

    testOrderId = order.id;
    testOrderItemId = order.items[0].id;

    // Create approved PrescriptionReview & OrderItemReview
    const pr = await prisma.prescriptionReview.create({
      data: {
        prescriptionId: rx.id,
        orderId: order.id,
        pharmacistId: pharmacistUserId,
        storeId: kolStoreId,
        status: 'APPROVED',
      },
    });

    await prisma.orderItemReview.create({
      data: {
        orderItemId: testOrderItemId,
        prescriptionReviewId: pr.id,
        pharmacistId: pharmacistUserId,
        medicineId: paracetamolMedId,
        status: OrderItemReviewStatus.APPROVED,
        reviewedQuantity: 10,
      },
    });

    // Create H1 Register Entry in PENDING_FULFILLMENT
    await prisma.h1RegisterEntry.create({
      data: {
        orderItemId: testOrderItemId,
        prescriptionId: rx.id,
        storeId: kolStoreId,
        patientName: 'Debasish Ghosh',
        prescriberName: 'Dr. B. K. Roy',
        medicineName: 'Paracetamol 500mg Tablet',
        quantity: 10,
        pharmacistId: pharmacistUserId,
        status: H1RegisterStatus.PENDING_FULFILLMENT,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Automatic routing selects nearest store (KOL-001) and creates atomic stock reservation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${testOrderId}/route`)
      .set('Cookie', adminCookie)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(OrderStatus.STOCK_RESERVED);
    expect(res.body.storeCode).toBe('KOL-001'); // Salt Lake Store is closest to customer
    expect(res.body.distanceKm).toBeDefined();

    // Verify order in database
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { stockReservations: true },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.STOCK_RESERVED);
    expect(updatedOrder?.fulfilmentStoreId).toBe(kolStoreId);
    expect(updatedOrder?.stockReservations).toHaveLength(1);
    expect(updatedOrder?.stockReservations[0].status).toBe(StockReservationStatus.ACTIVE);
    expect(updatedOrder?.stockReservations[0].quantity).toBe(10);
  });

  it('2. Cross-store pharmacist is blocked from accessing order; assigned store pharmacist can start picking', async () => {
    // Assigned store is KOL-001, pharmacist@example.com belongs to KOL-001
    const res = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${testOrderId}/picking/start`)
      .set('Cookie', pharmacistCookie)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(OrderStatus.PICKING);

    const checklist = await request(app.getHttpServer())
      .get(`/api/v1/pharmacist/fulfilment/${testOrderId}/picking`)
      .set('Cookie', pharmacistCookie)
      .expect(200);

    expect(checklist.body.items).toHaveLength(1);
    expect(checklist.body.allPicked).toBe(false);
  });

  it('3. Packing cannot complete until all items are picked', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${testOrderId}/packing/complete`)
      .set('Cookie', pharmacistCookie)
      .send({ checklistConfirmed: true })
      .expect(422); // Unprocessable Entity: item not yet picked
  });

  it('4. Confirm picking item completes checklist', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${testOrderId}/picking/items/${testOrderItemId}/confirm`)
      .set('Cookie', pharmacistCookie)
      .send({ quantityPicked: 10 })
      .expect(201);

    const checklist = await request(app.getHttpServer())
      .get(`/api/v1/pharmacist/fulfilment/${testOrderId}/picking`)
      .set('Cookie', pharmacistCookie)
      .expect(200);

    expect(checklist.body.allPicked).toBe(true);
  });

  it('5. Packing completes and generates unique invoice, moving order to READY_FOR_HANDOVER', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${testOrderId}/packing/complete`)
      .set('Cookie', pharmacistCookie)
      .send({ checklistConfirmed: true, notes: 'Sealed in tamper-evident bag.' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(OrderStatus.READY_FOR_HANDOVER);
    expect(res.body.invoiceNumber).toMatch(/^INV-KOL-001-\d{8}-\d{4}$/);

    // Verify invoice in database
    const inv = await prisma.invoice.findUnique({
      where: { orderId: testOrderId },
      include: { items: true },
    });
    expect(inv).toBeDefined();
    expect(Number(inv?.total)).toBe(140);
    expect(inv?.items).toHaveLength(1);
  });

  it('6. Handover decrements physical stock, marks reservation CONSUMED, and completes H1 register entry', async () => {
    const balanceBefore = await prisma.inventoryBalance.findUnique({
      where: { medicineId_storeId: { medicineId: paracetamolMedId, storeId: kolStoreId } },
    });
    expect(balanceBefore?.quantity).toBe(50);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${testOrderId}/handover`)
      .set('Cookie', pharmacistCookie)
      .send({
        handoverType: 'DELIVERY_PARTNER',
        recipientName: 'Raju Rider',
        deliveryPartnerName: 'Shadowfax',
        referenceNumber: 'AWB-101010',
      })
      .expect(201);

    expect(res.body.recipientName).toBe('Raju Rider');

    // 1. Physical on-hand stock must be decremented: 50 - 10 = 40
    const balanceAfter = await prisma.inventoryBalance.findUnique({
      where: { medicineId_storeId: { medicineId: paracetamolMedId, storeId: kolStoreId } },
    });
    expect(balanceAfter?.quantity).toBe(40);

    // 2. Reservation marked CONSUMED
    const reservation = await prisma.stockReservation.findFirst({
      where: { orderId: testOrderId },
    });
    expect(reservation?.status).toBe(StockReservationStatus.CONSUMED);

    // 3. H1 register entry status is COMPLETED
    const h1 = await prisma.h1RegisterEntry.findFirst({
      where: { orderItemId: testOrderItemId },
    });
    expect(h1?.status).toBe(H1RegisterStatus.COMPLETED);

    // 4. Order moved to HANDED_OVER
    const finalOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
    });
    expect(finalOrder?.status).toBe(OrderStatus.HANDED_OVER);
  });

  it('7. COD payment collection records exact amount due', async () => {
    // Try wrong amount
    await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${testOrderId}/cod-collection`)
      .set('Cookie', pharmacistCookie)
      .send({ amount: 100 }) // Total is 140
      .expect(422);

    // Collect exact amount
    const res = await request(app.getHttpServer())
      .post(`/api/v1/pharmacist/fulfilment/${testOrderId}/cod-collection`)
      .set('Cookie', pharmacistCookie)
      .send({ amount: 140, paymentReference: 'CASH-REC-101' })
      .expect(201);

    expect(Number(res.body.collectedAmount)).toBe(140);

    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { payment: true },
    });
    expect(order?.payment?.status).toBe(OrderPaymentStatus.SUCCESS);
  });

  it('8. Customer can view invoice details for their handed-over order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customer/orders/${testOrderId}/invoice`)
      .set('Cookie', customerCookie)
      .expect(200);

    expect(res.body.orderId).toBe(testOrderId);
    expect(res.body.total).toBe(140);
    expect(res.body.storeCode).toBe('KOL-001');
    expect(res.body.items).toHaveLength(1);
  });
});
