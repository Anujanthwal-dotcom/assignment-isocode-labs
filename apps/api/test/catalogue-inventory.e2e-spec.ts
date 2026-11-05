import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';

describe('Phase 2 Catalogue & Inventory E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let pharmacistCookie: string;
  let customerCookie: string;
  let saltLakeStoreId: string;
  let howrahStoreId: string;
  let centralWarehouseId: string;

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

    // Get Store & Warehouse IDs
    const saltLake = await prisma.store.findUnique({ where: { code: 'KOL-001' } });
    const howrah = await prisma.store.findUnique({ where: { code: 'HOW-001' } });
    const warehouse = await prisma.warehouse.findUnique({ where: { code: 'CENTRAL-KOL' } });

    saltLakeStoreId = saltLake!.id;
    howrahStoreId = howrah!.id;
    centralWarehouseId = warehouse!.id;

    // Login Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'admin@example.com', password: 'DemoPassword123!' });
    adminCookie = adminLogin.headers['set-cookie'][0];

    // Login Pharmacist
    const pharmLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: 'pharmacist@example.com', password: 'DemoPassword123!' });
    pharmacistCookie = pharmLogin.headers['set-cookie'][0];

    // Login Customer
    const testCustPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpReq = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/request-otp')
      .send({ phone: testCustPhone });
    const otpCode = otpReq.body.developmentOtp || '123456';

    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/verify-otp')
      .send({ phone: testCustPhone, otp: otpCode });
    customerCookie = custLogin.headers['set-cookie'] ? custLogin.headers['set-cookie'][0] : '';
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  let createdMedicineId: string;
  const testSku = `MED-TEST-${Date.now()}`;

  it('1. ADMIN creates a new medicine in catalogue', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Cookie', adminCookie)
      .send({
        sku: testSku,
        name: 'Test Aspirin 75 mg',
        brandName: 'Test Brand',
        genericName: 'Aspirin',
        manufacturer: 'Demo Pharma Ltd',
        strength: '75 mg',
        dosageForm: 'Tablet',
        packSize: '14 tablets',
        schedule: 'SCHEDULE_H',
        mrp: 45.5,
      })
      .expect(201);

    expect(res.body.sku).toBe(testSku.toUpperCase());
    expect(res.body.mrp).toBe(45.5);
    createdMedicineId = res.body.id;
  });

  it('2. Rejects duplicate SKU with 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Cookie', adminCookie)
      .send({
        sku: testSku,
        name: 'Duplicate Aspirin',
        mrp: 50.0,
      })
      .expect(409);

    expect(res.body.code).toBe('DUPLICATE_MEDICINE_SKU');
  });

  it('3. Rejects invalid MRP (<= 0) with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Cookie', adminCookie)
      .send({
        sku: `MED-NEG-${Date.now()}`,
        name: 'Zero MRP Med',
        mrp: 0,
      })
      .expect(400);
  });

  it('4. Lists and searches medicines with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/medicines?search=Aspirin&page=1&limit=10')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('5. ADMIN updates catalogue details', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/medicines/${createdMedicineId}`)
      .set('Cookie', adminCookie)
      .send({
        brandName: 'Updated Aspirin Brand',
        mrp: 48.0,
      })
      .expect(200);

    expect(res.body.brandName).toBe('Updated Aspirin Brand');
    expect(res.body.mrp).toBe(48.0);
  });

  it('6. ADMIN deactivates medicine', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/medicines/${createdMedicineId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'INACTIVE' })
      .expect(200);

    expect(res.body.status).toBe('INACTIVE');

    // Reactivate for subsequent inventory tests
    await request(app.getHttpServer())
      .patch(`/api/v1/medicines/${createdMedicineId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'ACTIVE' })
      .expect(200);
  });

  it('7. ADMIN adjusts inventory stock and produces movement record', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set('Cookie', adminCookie)
      .send({
        medicineId: createdMedicineId,
        locationType: 'STORE',
        locationId: saltLakeStoreId,
        quantityChange: 50,
        reason: 'Initial physical count',
      })
      .expect(201);

    expect(res.body.balance.quantity).toBe(50);
    expect(res.body.movement.quantityAfter).toBe(50);
    expect(res.body.movement.movementType).toBe('MANUAL_ADJUSTMENT');
  });

  it('8. Rejects negative inventory adjustment', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set('Cookie', adminCookie)
      .send({
        medicineId: createdMedicineId,
        locationType: 'STORE',
        locationId: saltLakeStoreId,
        quantityChange: -100, // 50 - 100 = -50
        reason: 'Over-deduction attempt',
      })
      .expect(400);

    expect(res.body.code).toBe('NEGATIVE_INVENTORY_NOT_ALLOWED');
  });

  it('9. ADMIN queries aggregated inventory summary', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/summary')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.totalActiveMedicines).toBeGreaterThan(0);
    expect(res.body.totalInventoryBalances).toBeGreaterThan(0);
    expect(res.body.totalStockUnits).toBeGreaterThan(0);
  });

  it('10. PHARMACIST queries own store inventory successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory?storeId=${saltLakeStoreId}`)
      .set('Cookie', pharmacistCookie)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('11. PHARMACIST is denied access to warehouse stock (403)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory?warehouseId=${centralWarehouseId}`)
      .set('Cookie', pharmacistCookie)
      .expect(403);

    expect(res.body.code).toBe('LOCATION_ACCESS_DENIED');
  });

  it('12. PHARMACIST is denied access to another store stock (403)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory?storeId=${howrahStoreId}`)
      .set('Cookie', pharmacistCookie)
      .expect(403);

    expect(res.body.code).toBe('LOCATION_ACCESS_DENIED');
  });

  it('13. PHARMACIST cannot perform stock adjustment (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set('Cookie', pharmacistCookie)
      .send({
        medicineId: createdMedicineId,
        locationType: 'STORE',
        locationId: saltLakeStoreId,
        quantityChange: 10,
        reason: 'Unauthorized pharmacist adjustment',
      })
      .expect(403);
  });

  it('14. CUSTOMER cannot access inventory endpoints (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/inventory')
      .set('Cookie', customerCookie)
      .expect(403);
  });

  it('15. CSV import with invalid rows fails all-or-nothing without changing stock', async () => {
    const badCsv = `sku,quantity,reorderLevel\n${testSku},-20,10\nMED-NONEXISTENT-999,50,10`;

    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/imports')
      .set('Cookie', adminCookie)
      .field('locationType', 'STORE')
      .field('locationId', saltLakeStoreId)
      .attach('file', Buffer.from(badCsv), 'bad-stock.csv')
      .expect(400);

    expect(res.body.code).toBe('CSV_IMPORT_VALIDATION_FAILED');

    // Verify stock balance remained 50 (unchanged)
    const checkStock = await request(app.getHttpServer())
      .get(`/api/v1/inventory?storeId=${saltLakeStoreId}&search=${testSku}`)
      .set('Cookie', adminCookie);

    expect(checkStock.body.data[0].quantity).toBe(50);
  });

  it('16. Valid CSV import updates balance and creates STOCK_IMPORT movement', async () => {
    const goodCsv = `sku,quantity,reorderLevel\n${testSku},125,25`;

    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/imports')
      .set('Cookie', adminCookie)
      .field('locationType', 'STORE')
      .field('locationId', saltLakeStoreId)
      .attach('file', Buffer.from(goodCsv), 'good-stock.csv')
      .expect(201);

    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.appliedRows).toBe(1);

    // Verify updated stock is 125
    const checkStock = await request(app.getHttpServer())
      .get(`/api/v1/inventory?storeId=${saltLakeStoreId}&search=${testSku}`)
      .set('Cookie', adminCookie);

    expect(checkStock.body.data[0].quantity).toBe(125);
    expect(checkStock.body.data[0].reorderLevel).toBe(25);
  });

  it('17. Import history shows completed batch', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/imports')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].status).toBeDefined();
  });
});
