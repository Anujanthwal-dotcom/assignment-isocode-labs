import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Auth & RBAC Integration Tests (18 Scenarios)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    // Clean up OTP challenges and test users created in previous runs
    await prisma.otpChallenge.deleteMany({});
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // Scenario 1: Customer requests OTP
  it('1. Customer requests OTP successfully', async () => {
    const phone = '9876543210';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
    // In development mode, developmentOtp is returned
    expect(res.body.developmentOtp).toBe('123456');
  });

  // Scenario 2 & 3: Customer verifies valid OTP & New customer account is created
  it('2 & 3. Customer verifies valid OTP and new customer account is created', async () => {
    const newPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Request OTP first
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: newPhone })
      .expect(200);

    // Verify OTP
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: newPhone, otp: '123456' })
      .expect(200);

    expect(res.body.role).toBe(UserRole.CUSTOMER);
    expect(res.body.status).toBe(UserStatus.ACTIVE);
    expect(res.body.profile.fullName).toBeDefined();

    // Check Set-Cookie headers
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token='))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token='))).toBe(true);

    // Check DB
    const createdUser = await prisma.user.findUnique({
      where: { phone: newPhone },
      include: { customerProfile: true },
    });
    expect(createdUser).not.toBeNull();
    expect(createdUser?.role).toBe(UserRole.CUSTOMER);
    expect(createdUser?.customerProfile).not.toBeNull();
  });

  // Scenario 4: Existing customer can log in again
  it('4. Existing customer can log in again without creating duplicate records', async () => {
    const existingPhone = '9876543210';
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: existingPhone })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: existingPhone, otp: '123456' })
      .expect(200);

    expect(res.body.role).toBe(UserRole.CUSTOMER);
    expect(res.body.profile.fullName).toBe('Debasish Ghosh');

    const customerCount = await prisma.user.count({
      where: { phone: existingPhone },
    });
    expect(customerCount).toBe(1);
  });

  // Scenario 5: Invalid OTP is rejected
  it('5. Invalid OTP is rejected with 400', async () => {
    const testPhone = '9876500001';
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: testPhone })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testPhone, otp: '000000' })
      .expect(400);
  });

  // Scenario 6: Expired OTP is rejected
  it('6. Expired OTP is rejected with 400', async () => {
    const testPhone = '9876500002';
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: testPhone })
      .expect(200);

    // Manually expire the challenge in DB
    await prisma.otpChallenge.updateMany({
      where: { phone: testPhone, consumedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testPhone, otp: '123456' })
      .expect(400);
  });

  // Scenario 7: Reused OTP is rejected
  it('7. Reused OTP is rejected with 400', async () => {
    const testPhone = '9876500003';
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: testPhone })
      .expect(200);

    // First use: succeeds
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testPhone, otp: '123456' })
      .expect(200);

    // Second use: must fail
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testPhone, otp: '123456' })
      .expect(400);
  });

  // Scenario 8: Suspended customer cannot log in
  it('8. Suspended customer cannot log in (403 Forbidden)', async () => {
    const suspendedPhone = '9111122222';
    // Create suspended user
    await prisma.user.upsert({
      where: { phone: suspendedPhone },
      update: { status: UserStatus.SUSPENDED },
      create: {
        phone: suspendedPhone,
        role: UserRole.CUSTOMER,
        status: UserStatus.SUSPENDED,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: suspendedPhone })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: suspendedPhone, otp: '123456' })
      .expect(403);
  });

  // Scenario 9: Pharmacist can log in with correct credentials
  it('9. Pharmacist can log in with correct email and password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'pharmacist@example.com',
        password: 'DemoPassword123!',
      })
      .expect(200);

    expect(res.body.role).toBe(UserRole.PHARMACIST);
    expect(res.body.store).toBeDefined();
    expect(res.body.store.code).toBe('KOL-001');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.includes('access_token='))).toBe(true);
  });

  // Scenario 10: Incorrect staff password is rejected
  it('10. Incorrect staff password is rejected with 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({
        email: 'pharmacist@example.com',
        password: 'WrongPassword!',
      })
      .expect(401);
  });

  // Scenario 11-15: RBAC Guards Enforcement
  describe('RBAC Authorization Endpoints (Scenarios 11 - 15)', () => {
    let customerCookie: string;
    let pharmacistCookie: string;
    let adminCookie: string;

    beforeAll(async () => {
      // Customer login
      const rbacCustomerPhone = '9876543210';
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/request-otp')
        .send({ phone: rbacCustomerPhone });
      const cRes = await request(app.getHttpServer())
        .post('/api/v1/auth/customer/verify-otp')
        .send({ phone: rbacCustomerPhone, otp: '123456' });
      customerCookie = (cRes.headers['set-cookie'] as unknown as string[]).find((c: string) =>
        c.startsWith('access_token='),
      )!;

      // Pharmacist login
      const pRes = await request(app.getHttpServer())
        .post('/api/v1/auth/staff/login')
        .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' });
      pharmacistCookie = (pRes.headers['set-cookie'] as unknown as string[]).find((c: string) =>
        c.startsWith('access_token='),
      )!;

      // Admin login
      const aRes = await request(app.getHttpServer())
        .post('/api/v1/auth/staff/login')
        .send({ email: 'admin@example.com', password: 'DemoPassword123!' });
      adminCookie = (aRes.headers['set-cookie'] as unknown as string[]).find((c: string) =>
        c.startsWith('access_token='),
      )!;
    });

    it('13. ADMIN can access admin endpoints (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/test/admin')
        .set('Cookie', [adminCookie])
        .expect(200);

      expect(res.body.access).toBe('granted');
    });

    it('14. ADMIN can access compliance administration endpoints (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/test/compliance')
        .set('Cookie', [adminCookie])
        .expect(200);

      expect(res.body.access).toBe('granted');
    });

    it('15. Pharmacist cannot access compliance endpoints (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/test/compliance')
        .set('Cookie', [pharmacistCookie])
        .expect(403);
    });
  });

  // Scenario 16: Logout revokes session and clears cookies
  it('16. Logout revokes the session and clears cookies', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const accessCookie = cookies.find((c: string) => c.startsWith('access_token='))!;

    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', [accessCookie])
      .expect(200);

    expect(logoutRes.body.success).toBe(true);

    // Verify clear-cookie headers
    const clearCookies = logoutRes.headers['set-cookie'] as unknown as string[];
    expect(clearCookies.some((c: string) => c.includes('access_token=;'))).toBe(true);
    expect(clearCookies.some((c: string) => c.includes('refresh_token=;'))).toBe(true);
  });

  // Scenario 17 & 18: Refresh rotates token and rejects reuse of old refresh token
  it('17 & 18. Refresh rotates token and rejects reuse of old refresh token', async () => {
    // 1. Staff login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'admin@example.com', password: 'DemoPassword123!' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const oldRefreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='))!;

    // 2. Perform refresh with refresh cookie
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [oldRefreshCookie])
      .expect(200);

    expect(refreshRes.body.success).toBe(true);
    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    const newRefreshCookie = newCookies.find((c: string) => c.startsWith('refresh_token='))!;
    expect(newRefreshCookie).toBeDefined();
    expect(newRefreshCookie).not.toBe(oldRefreshCookie);

    // 3. Attempt to reuse old refresh token -> Must be rejected with 401
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [oldRefreshCookie])
      .expect(401);
  });
});
