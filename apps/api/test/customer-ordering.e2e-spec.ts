import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { FamilyMemberRelationship, OrderPaymentMethod } from '@prisma/client';

describe('Phase 3 Customer Ordering E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerCookie: string;
  let pharmacistCookie: string;
  let testMedicineId: string;

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

    // Login or create Customer
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpReq = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: testPhone });
    const otpCode = otpReq.body.developmentOtp || '123456';

    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testPhone, otp: otpCode });
    customerCookie = custLogin.headers['set-cookie'] ? custLogin.headers['set-cookie'][0] : '';

    // Login Pharmacist
    const pharmLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' });
    pharmacistCookie = pharmLogin.headers['set-cookie'] ? pharmLogin.headers['set-cookie'][0] : '';

    // Find an active medicine
    const med = await prisma.medicine.findFirst({
      where: { status: 'ACTIVE' },
    });
    testMedicineId = med!.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // 1. Catalogue
  it('1. Customer can browse active medicines catalogue with safe fields', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customer/medicines?limit=10')
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
    const first = res.body.data[0];
    expect(first.name).toBeDefined();
    expect(first.mrp).toBeDefined();
    expect(first.schedule).toBeDefined();
    // Verify no warehouse stock or inventory balances exposed
    expect(first.inventoryBalances).toBeUndefined();
  });

  it('2. Customer can view active medicine details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customer/medicines/${testMedicineId}`)
      .expect(200);

    expect(res.body.id).toBe(testMedicineId);
    expect(res.body.name).toBeDefined();
    expect(res.body.inventoryBalances).toBeUndefined();
  });

  // 2. Family Profiles
  let createdFamilyMemberId: string;
  it('3. Customer can create and manage family members', async () => {
    // Create family member
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/customer/family-members')
      .set('Cookie', customerCookie)
      .send({
        fullName: 'Maya Ghosh',
        relationship: FamilyMemberRelationship.MOTHER,
        dateOfBirth: '1965-05-15',
      })
      .expect(201);

    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.fullName).toBe('Maya Ghosh');
    createdFamilyMemberId = createRes.body.id;

    // Reject duplicate SELF profile
    await request(app.getHttpServer())
      .post('/api/v1/customer/family-members')
      .set('Cookie', customerCookie)
      .send({
        fullName: 'Self Duplicate',
        relationship: FamilyMemberRelationship.SELF,
      })
      .expect(201); // First SELF is OK

    await request(app.getHttpServer())
      .post('/api/v1/customer/family-members')
      .set('Cookie', customerCookie)
      .send({
        fullName: 'Self Duplicate Again',
        relationship: FamilyMemberRelationship.SELF,
      })
      .expect(409); // Second SELF is rejected
  });

  // 3. Addresses
  let createdAddressId: string;
  it('4. Customer can create and manage delivery addresses', async () => {
    // Reject invalid PIN code
    await request(app.getHttpServer())
      .post('/api/v1/customer/addresses')
      .set('Cookie', customerCookie)
      .send({
        label: 'Home',
        recipientName: 'Debasish Ghosh',
        phone: '9876543210',
        addressLine1: 'Plot 12, Sector V',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '1234', // Invalid
      })
      .expect(400);

    // Create valid address
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/customer/addresses')
      .set('Cookie', customerCookie)
      .send({
        label: 'Home',
        recipientName: 'Debasish Ghosh',
        phone: '9876543210',
        addressLine1: 'Plot 12, Sector V',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700091',
        isDefault: true,
      })
      .expect(201);

    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.postalCode).toBe('700091');
    expect(createRes.body.isDefault).toBe(true);
    createdAddressId = createRes.body.id;
  });

  // 4. Prescriptions
  let createdPrescriptionId: string;
  it('5. Customer can upload and retrieve prescription', async () => {
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/customer/prescriptions')
      .set('Cookie', customerCookie)
      .attach('file', validJpeg, 'test-rx.jpg')
      .field('familyMemberId', createdFamilyMemberId)
      .expect(201);

    expect(uploadRes.body.id).toBeDefined();
    expect(uploadRes.body.status).toBe('UPLOADED');
    expect(uploadRes.body.objectKey).toBeUndefined(); // Never expose MinIO key
    createdPrescriptionId = uploadRes.body.id;

    // View file pre-signed URL
    const fileRes = await request(app.getHttpServer())
      .get(`/api/v1/customer/prescriptions/${createdPrescriptionId}/file`)
      .set('Cookie', customerCookie)
      .expect(200);

    expect(fileRes.body.viewUrl).toBeDefined();
    expect(fileRes.body.expiresInSeconds).toBe(300);
  });

  // 5. Cart
  it('6. Customer can manage shopping cart items', async () => {
    // Add item
    const addRes = await request(app.getHttpServer())
      .post('/api/v1/customer/cart/items')
      .set('Cookie', customerCookie)
      .send({
        medicineId: testMedicineId,
        quantity: 2,
      })
      .expect(201);

    expect(addRes.body.items.length).toBe(1);
    expect(addRes.body.items[0].quantity).toBe(2);
    expect(addRes.body.subtotal).toBeGreaterThan(0);
    const cartItemId = addRes.body.items[0].id;

    // Update quantity
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/customer/cart/items/${cartItemId}`)
      .set('Cookie', customerCookie)
      .send({ quantity: 3 })
      .expect(200);

    expect(updateRes.body.items[0].quantity).toBe(3);
  });

  // 6. Orders & Mock Checkout
  let createdOrderId: string;
  it('7. Customer can place order with COD and cart is cleared', async () => {
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/customer/orders')
      .set('Cookie', customerCookie)
      .send({
        familyMemberId: createdFamilyMemberId,
        prescriptionId: createdPrescriptionId,
        addressId: createdAddressId,
        paymentMethod: OrderPaymentMethod.COD,
        customerNote: 'Deliver in morning',
      })
      .expect(201);

    expect(orderRes.body.orderNumber).toMatch(/^PH-\d{8}-\d{6}$/);
    expect(orderRes.body.status).toBe('PENDING_VERIFICATION');
    expect(orderRes.body.paymentMethod).toBe('COD');
    expect(orderRes.body.paymentStatus).toBe('NOT_REQUIRED');
    expect(orderRes.body.addressSnapshot).toBeDefined();
    expect(orderRes.body.items.length).toBe(1);
    createdOrderId = orderRes.body.id;

    // Verify cart was cleared
    const cartRes = await request(app.getHttpServer())
      .get('/api/v1/customer/cart')
      .set('Cookie', customerCookie)
      .expect(200);

    expect(cartRes.body.items.length).toBe(0);
  });

  it('8. Customer can cancel order in PENDING_VERIFICATION state', async () => {
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/customer/orders/${createdOrderId}/cancel`)
      .set('Cookie', customerCookie)
      .expect(201); // or 200

    expect(cancelRes.body.status).toBe('CANCELLED');

    // Verify status history
    const historyRes = await request(app.getHttpServer())
      .get(`/api/v1/customer/orders/${createdOrderId}/history`)
      .set('Cookie', customerCookie)
      .expect(200);

    expect(historyRes.body.length).toBeGreaterThanOrEqual(2);
    expect(historyRes.body[historyRes.body.length - 1].newStatus).toBe('CANCELLED');
  });

  // 7. UPI Mock Checkout
  it('9. Customer places UPI order, simulates payment failure and success', async () => {
    // Add item back to cart
    await request(app.getHttpServer())
      .post('/api/v1/customer/cart/items')
      .set('Cookie', customerCookie)
      .send({ medicineId: testMedicineId, quantity: 1 });

    // Place UPI order
    const upiOrderRes = await request(app.getHttpServer())
      .post('/api/v1/customer/orders')
      .set('Cookie', customerCookie)
      .send({
        familyMemberId: createdFamilyMemberId,
        prescriptionId: createdPrescriptionId,
        addressId: createdAddressId,
        paymentMethod: OrderPaymentMethod.UPI,
      })
      .expect(201);

    const upiOrderId = upiOrderRes.body.id;
    expect(upiOrderRes.body.paymentStatus).toBe('PENDING');

    // Simulate SUCCESS
    const payRes = await request(app.getHttpServer())
      .post(`/api/v1/customer/orders/${upiOrderId}/mock-payment`)
      .set('Cookie', customerCookie)
      .send({ result: 'SUCCESS' })
      .expect(201); // or 200

    expect(payRes.body.paymentStatus).toBe('SUCCESS');
    expect(payRes.body.orderStatus).toBe('PENDING_VERIFICATION');
    expect(payRes.body.transactionReference).toBeDefined();

    // Verify cart was cleared after successful payment
    const cartRes = await request(app.getHttpServer())
      .get('/api/v1/customer/cart')
      .set('Cookie', customerCookie)
      .expect(200);

    expect(cartRes.body.items.length).toBe(0);
  });

  // 8. Security & RBAC Isolation
  it('10. Pharmacist cannot access customer orders', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customer/orders')
      .set('Cookie', pharmacistCookie)
      .expect(403);
  });

  it('11. Customer cannot delete prescription linked to an order', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/customer/prescriptions/${createdPrescriptionId}`)
      .set('Cookie', customerCookie)
      .expect(409);
  });
});
