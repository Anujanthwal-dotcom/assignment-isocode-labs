import {
  PrismaClient,
  UserRole,
  UserStatus,
  StoreStatus,
  MedicineSchedule,
  MedicineStatus,
  InventoryMovementType,
  Prisma,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    console.log('🌱 Starting database seed...');
  }

  // 1. Seed Stores
  const stores = [
    {
      code: 'KOL-001',
      name: 'Salt Lake Store',
      city: 'Kolkata',
      address: 'Plot 12, Sector V, Salt Lake, Kolkata (Demo Address)',
      latitude: 22.5867,
      longitude: 88.4178,
      status: StoreStatus.ACTIVE,
    },
    {
      code: 'HOW-001',
      name: 'Howrah Maidan Store',
      city: 'Howrah',
      address: 'Station Road, Howrah Maidan, Howrah (Demo Address)',
      latitude: 22.5898,
      longitude: 88.3248,
      status: StoreStatus.ACTIVE,
    },
  ];

  const seededStores: Record<string, string> = {};

  for (const store of stores) {
    const record = await prisma.store.upsert({
      where: { code: store.code },
      update: {
        name: store.name,
        city: store.city,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        status: store.status,
      },
      create: store,
    });
    seededStores[store.code] = record.id;
  }

  // 2. Seed Central Warehouse
  const centralWarehouse = await prisma.warehouse.upsert({
    where: { code: 'CENTRAL-KOL' },
    update: {
      name: 'Central Warehouse',
      city: 'Kolkata',
      address: 'Plot 99, Logistics Park, Sector V, Salt Lake, Kolkata (Demo Address)',
      status: StoreStatus.ACTIVE,
    },
    create: {
      code: 'CENTRAL-KOL',
      name: 'Central Warehouse',
      city: 'Kolkata',
      address: 'Plot 99, Logistics Park, Sector V, Salt Lake, Kolkata (Demo Address)',
      status: StoreStatus.ACTIVE,
    },
  });

  // 3. Hash Default Staff Password using Argon2id
  const staffPassword = 'DemoPassword123!';
  const passwordHash = await argon2.hash(staffPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 4. Seed Users
  // Customer: Debasish Ghosh (9876543210)
  const customerUser = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
    create: {
      phone: '9876543210',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {
      fullName: 'Debasish Ghosh',
      preferredLanguage: 'en',
    },
    create: {
      userId: customerUser.id,
      fullName: 'Debasish Ghosh',
      preferredLanguage: 'en',
    },
  });

  // Pharmacist: Demo Pharmacist (pharmacist@example.com) -> KOL-001
  const pharmacistUser = await prisma.user.upsert({
    where: { email: 'pharmacist@example.com' },
    update: {
      role: UserRole.PHARMACIST,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
    create: {
      email: 'pharmacist@example.com',
      role: UserRole.PHARMACIST,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
  });

  await prisma.pharmacistProfile.upsert({
    where: { userId: pharmacistUser.id },
    update: {
      fullName: 'Demo Pharmacist',
      storeId: seededStores['KOL-001'],
      registrationNumber: null,
    },
    create: {
      userId: pharmacistUser.id,
      fullName: 'Demo Pharmacist',
      storeId: seededStores['KOL-001'],
      registrationNumber: null,
    },
  });

  // Admin: Demo Admin (admin@example.com)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
    create: {
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
  });

  // Compliance Admin: Demo Compliance Admin (compliance@example.com)
  await prisma.user.upsert({
    where: { email: 'compliance@example.com' },
    update: {
      role: UserRole.COMPLIANCE_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
    create: {
      email: 'compliance@example.com',
      role: UserRole.COMPLIANCE_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
  });

  // 5. Seed Catalogue Medicines
  const medicines = [
    {
      sku: 'MED-MET-500-001',
      name: 'Metformin 500 mg',
      brandName: 'Glyciphage Demo',
      genericName: 'Metformin',
      manufacturer: 'Franco-Indian Demo Ltd',
      strength: '500 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('30.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-TEL-40-001',
      name: 'Telmisartan 40 mg',
      brandName: 'Telma Demo',
      genericName: 'Telmisartan',
      manufacturer: 'Glenmark Demo Labs',
      strength: '40 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('95.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-LEV-50-001',
      name: 'Levothyroxine 50 mcg',
      brandName: 'Thyronorm Demo',
      genericName: 'Levothyroxine',
      manufacturer: 'Abbott Demo Healthcare',
      strength: '50 mcg',
      dosageForm: 'Tablet',
      packSize: '100 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('190.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-PAR-500-001',
      name: 'Paracetamol 500 mg',
      brandName: 'Crocin Demo',
      genericName: 'Paracetamol',
      manufacturer: 'GSK Demo Asia',
      strength: '500 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('20.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-ORS-001',
      name: 'ORS Powder',
      brandName: 'Electral Demo',
      genericName: 'Oral Rehydration Salts',
      manufacturer: 'FDC Demo Ltd',
      strength: 'Standard',
      dosageForm: 'Powder',
      packSize: '1 sachet',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('22.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-AMX-500-001',
      name: 'Amoxicillin 500 mg',
      brandName: 'Novamox Demo',
      genericName: 'Amoxicillin',
      manufacturer: 'Cipla Demo Labs',
      strength: '500 mg',
      dosageForm: 'Capsule',
      packSize: '10 capsules',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('80.00'),
      status: MedicineStatus.ACTIVE,
    },
  ];

  const seededMedicines: Record<string, string> = {};

  for (const med of medicines) {
    const record = await prisma.medicine.upsert({
      where: { sku: med.sku },
      update: {
        name: med.name,
        brandName: med.brandName,
        genericName: med.genericName,
        manufacturer: med.manufacturer,
        strength: med.strength,
        dosageForm: med.dosageForm,
        packSize: med.packSize,
        schedule: med.schedule,
        mrp: med.mrp,
        status: med.status,
      },
      create: med,
    });
    seededMedicines[med.sku] = record.id;
  }

  // 6. Seed Deterministic Balances & Opening Stock Movements
  // Initial demo stock grid
  const initialStockData = [
    { sku: 'MED-MET-500-001', saltLake: 120, howrah: 0, warehouse: 500 },
    { sku: 'MED-TEL-40-001', saltLake: 8, howrah: 75, warehouse: 200 },
    { sku: 'MED-LEV-50-001', saltLake: 42, howrah: 10, warehouse: 150 },
    { sku: 'MED-PAR-500-001', saltLake: 200, howrah: 150, warehouse: 1000 },
    { sku: 'MED-ORS-001', saltLake: 0, howrah: 45, warehouse: 300 },
    { sku: 'MED-AMX-500-001', saltLake: 12, howrah: 0, warehouse: 100 },
  ];

  const locations = [
    { type: 'STORE', id: seededStores['KOL-001'], code: 'KOL-001', key: 'saltLake' as const },
    { type: 'STORE', id: seededStores['HOW-001'], code: 'HOW-001', key: 'howrah' as const },
    { type: 'WAREHOUSE', id: centralWarehouse.id, code: 'CENTRAL-KOL', key: 'warehouse' as const },
  ];

  for (const item of initialStockData) {
    const medicineId = seededMedicines[item.sku];

    for (const loc of locations) {
      const initialQuantity = item[loc.key];
      const storeId = loc.type === 'STORE' ? loc.id : null;
      const warehouseId = loc.type === 'WAREHOUSE' ? loc.id : null;
      const refId = `SEED_OPENING_${item.sku}_${loc.code}`;

      // 1. Check if balance already exists
      const existingBalance = storeId
        ? await prisma.inventoryBalance.findUnique({
            where: { medicineId_storeId: { medicineId, storeId } },
          })
        : await prisma.inventoryBalance.findUnique({
            where: { medicineId_warehouseId: { medicineId, warehouseId: warehouseId! } },
          });

      if (!existingBalance) {
        // Create initial balance
        await prisma.inventoryBalance.create({
          data: {
            medicineId,
            storeId,
            warehouseId,
            quantity: initialQuantity,
            reorderLevel: 10,
          },
        });
      }

      // 2. Check if OPENING_STOCK movement already recorded
      const existingMovement = await prisma.inventoryMovement.findFirst({
        where: { referenceId: refId },
      });

      if (!existingMovement) {
        await prisma.inventoryMovement.create({
          data: {
            medicineId,
            storeId,
            warehouseId,
            movementType: InventoryMovementType.OPENING_STOCK,
            quantityBefore: 0,
            quantityChange: initialQuantity,
            quantityAfter: initialQuantity,
            reason: 'Initial demo opening stock balance',
            referenceId: refId,
            performedByUserId: adminUser.id,
          },
        });
      }
    }
  }

  if (isDev) {
    console.log('✅ Database seeded successfully:');
    console.log('--------------------------------------------------');
    console.log('Stores:');
    console.log('  - KOL-001: Salt Lake Store (Kolkata)');
    console.log('  - HOW-001: Howrah Maidan Store (Howrah)');
    console.log('Warehouses:');
    console.log('  - CENTRAL-KOL: Central Warehouse (Kolkata)');
    console.log('Medicines: 6 demo medicines catalogue seeded.');
    console.log('Inventory: Balances & Opening stock movements verified.');
    console.log('Demo Accounts:');
    console.log('  - CUSTOMER:         Phone: 9876543210, Mock OTP: 123456');
    console.log('  - PHARMACIST:       Email: pharmacist@example.com, Pass: DemoPassword123!');
    console.log('  - ADMIN:            Email: admin@example.com, Pass: DemoPassword123!');
    console.log('  - COMPLIANCE_ADMIN: Email: compliance@example.com, Pass: DemoPassword123!');
    console.log('--------------------------------------------------');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
