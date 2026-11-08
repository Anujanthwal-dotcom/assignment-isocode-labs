import {
  PrismaClient,
  UserRole,
  UserStatus,
  StoreStatus,
  MedicineSchedule,
  MedicineStatus,
  InventoryMovementType,
  ComplianceRuleSetStatus,
  CompliancePolicyAction,
  PrescriptionStatus,
  PrescriptionAIStatus,
  OrderStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  PrescriptionReviewStatus,
  OrderItemStatus,
  RefillSubscriptionStatus,
  RefillEligibilityStatus,
  Prisma,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import { Client as MinioClient } from 'minio';

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
    {
      code: 'SOU-001',
      name: 'South Kolkata Store',
      city: 'Kolkata',
      address: 'Gariahat Road, South Kolkata (Demo Address)',
      latitude: 22.52,
      longitude: 88.365,
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
  // Customer: Debasish Ghosh (9876543210, customer@example.com)
  const customerUser = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {
      email: 'customer@example.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
    create: {
      phone: '9876543210',
      email: 'customer@example.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
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

  // Seed Debasish's Mother: Maya Ghosh
  const existingMother = await prisma.familyMember.findFirst({
    where: {
      customerUserId: customerUser.id,
      fullName: 'Maya Ghosh',
    },
  });

  if (!existingMother) {
    await prisma.familyMember.create({
      data: {
        customerUserId: customerUser.id,
        fullName: 'Maya Ghosh',
        relationship: 'MOTHER',
        dateOfBirth: new Date('1958-04-12'),
      },
    });
  }

  // Seed Debasish's Salt Lake Delivery Address
  const existingDebasishAddress = await prisma.customerAddress.findFirst({
    where: {
      customerUserId: customerUser.id,
      label: 'Home (Salt Lake)',
    },
  });

  if (!existingDebasishAddress) {
    await prisma.customerAddress.create({
      data: {
        customerUserId: customerUser.id,
        label: 'Home (Salt Lake)',
        recipientName: 'Debasish Ghosh',
        phone: '9876543210',
        addressLine1: 'Block CD, Sector 1, Salt Lake City',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700064',
        latitude: 22.585,
        longitude: 88.41,
        isDefault: true,
      },
    });
  }

  // Customer 2: Rina Sen (9876543211, customer2@example.com) for Demo Scenario 2
  const customer2 = await prisma.user.upsert({
    where: { phone: '9876543211' },
    update: {
      email: 'customer2@example.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
    create: {
      phone: '9876543211',
      email: 'customer2@example.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash: passwordHash,
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customer2.id },
    update: {
      fullName: 'Rina Sen',
      preferredLanguage: 'en',
    },
    create: {
      userId: customer2.id,
      fullName: 'Rina Sen',
      preferredLanguage: 'en',
    },
  });

  const existingRinaAddress = await prisma.customerAddress.findFirst({
    where: {
      customerUserId: customer2.id,
      label: 'Home (Howrah)',
    },
  });

  if (!existingRinaAddress) {
    await prisma.customerAddress.create({
      data: {
        customerUserId: customer2.id,
        label: 'Home (Howrah)',
        recipientName: 'Rina Sen',
        phone: '9876543211',
        addressLine1: '42, GT Road, Howrah Maidan',
        city: 'Howrah',
        state: 'West Bengal',
        postalCode: '711101',
        latitude: 22.588,
        longitude: 88.326,
        isDefault: true,
      },
    });
  }

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
  const complianceAdminUser = await prisma.user.upsert({
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

  // 4b. Seed Initial Versioned Compliance Rule Set (v1.0.0)
  const activeRuleSet = await prisma.complianceRuleSet.upsert({
    where: { version: '1.0.0' },
    update: {
      name: 'Standard Operational Pharmacy Policy',
      description:
        'Initial deterministic compliance policy version 1.0.0 for prescription verification',
      status: ComplianceRuleSetStatus.ACTIVE,
      activatedByUserId: complianceAdminUser.id,
      activationReason: 'Initial deterministic baseline compliance activation',
    },
    create: {
      version: '1.0.0',
      name: 'Standard Operational Pharmacy Policy',
      description:
        'Initial deterministic compliance policy version 1.0.0 for prescription verification',
      status: ComplianceRuleSetStatus.ACTIVE,
      createdByUserId: complianceAdminUser.id,
      activatedByUserId: complianceAdminUser.id,
      activationReason: 'Initial deterministic baseline compliance activation',
    },
  });

  const complianceRulesData = [
    {
      medicineSchedule: MedicineSchedule.OTC,
      policyAction: CompliancePolicyAction.ALLOW_WITH_REVIEW,
      requiresPrescription: false,
      requiresPharmacistApproval: true,
      requiresH1Register: false,
      hardBlocked: false,
      description: 'OTC medicines require explicit pharmacist review for every medicine item.',
    },
    {
      medicineSchedule: MedicineSchedule.SCHEDULE_H,
      policyAction: CompliancePolicyAction.REQUIRE_PRESCRIPTION_AND_APPROVAL,
      requiresPrescription: true,
      requiresPharmacistApproval: true,
      requiresH1Register: false,
      hardBlocked: false,
      description:
        'Schedule H medicines require valid prescription and explicit pharmacist approval.',
    },
    {
      medicineSchedule: MedicineSchedule.SCHEDULE_H1,
      policyAction: CompliancePolicyAction.REQUIRE_H1_REGISTER,
      requiresPrescription: true,
      requiresPharmacistApproval: true,
      requiresH1Register: true,
      hardBlocked: false,
      description:
        'Schedule H1 medicines require valid prescription, pharmacist approval, and H1 register recording.',
    },
    {
      medicineSchedule: MedicineSchedule.SCHEDULE_X,
      policyAction: CompliancePolicyAction.HARD_BLOCK,
      requiresPrescription: true,
      requiresPharmacistApproval: false,
      requiresH1Register: false,
      hardBlocked: true,
      description:
        'Schedule X substances are hard-blocked from dispensing under the assignment policy.',
    },
    {
      medicineSchedule: MedicineSchedule.NARCOTIC,
      policyAction: CompliancePolicyAction.HARD_BLOCK,
      requiresPrescription: true,
      requiresPharmacistApproval: false,
      requiresH1Register: false,
      hardBlocked: true,
      description: 'Narcotic drugs are hard-blocked from dispensing under the assignment policy.',
    },
    {
      medicineSchedule: MedicineSchedule.UNKNOWN,
      policyAction: CompliancePolicyAction.FAIL_CLOSED,
      requiresPrescription: false,
      requiresPharmacistApproval: false,
      requiresH1Register: false,
      hardBlocked: false,
      description:
        'Unclassified medicines fail closed and cannot be approved until classified by compliance admin.',
    },
  ];

  for (const rule of complianceRulesData) {
    await prisma.complianceRule.upsert({
      where: {
        ruleSetId_medicineSchedule: {
          ruleSetId: activeRuleSet.id,
          medicineSchedule: rule.medicineSchedule,
        },
      },
      update: {
        policyAction: rule.policyAction,
        requiresPrescription: rule.requiresPrescription,
        requiresPharmacistApproval: rule.requiresPharmacistApproval,
        requiresH1Register: rule.requiresH1Register,
        hardBlocked: rule.hardBlocked,
        description: rule.description,
      },
      create: {
        ruleSetId: activeRuleSet.id,
        medicineSchedule: rule.medicineSchedule,
        policyAction: rule.policyAction,
        requiresPrescription: rule.requiresPrescription,
        requiresPharmacistApproval: rule.requiresPharmacistApproval,
        requiresH1Register: rule.requiresH1Register,
        hardBlocked: rule.hardBlocked,
        description: rule.description,
      },
    });
  }

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
    {
      sku: 'MED-ALP-05-001',
      name: 'Alprazolam 0.5 mg',
      brandName: 'Alprax Demo',
      genericName: 'Alprazolam',
      manufacturer: 'Torrent Demo Pharma',
      strength: '0.5 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H1,
      mrp: new Prisma.Decimal('45.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-MET-10-001',
      name: 'Methylphenidate 10 mg',
      brandName: 'Ritalin Demo',
      genericName: 'Methylphenidate',
      manufacturer: 'Novartis Demo Corp',
      strength: '10 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_X,
      mrp: new Prisma.Decimal('210.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-MOR-10-001',
      name: 'Morphine Sulphate 10 mg',
      brandName: 'Morphit Demo',
      genericName: 'Morphine',
      manufacturer: 'Rusan Demo Healthcare',
      strength: '10 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.NARCOTIC,
      mrp: new Prisma.Decimal('350.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-UNK-001',
      name: 'Unclassified Test Medicine 50 mg',
      brandName: 'Experimental Demo',
      genericName: 'Test Compound X',
      manufacturer: 'Unknown Lab',
      strength: '50 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.UNKNOWN,
      mrp: new Prisma.Decimal('15.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-PAR-500-002',
      name: 'Paracetamol 500 mg (Dolo Demo)',
      brandName: 'Dolo Demo',
      genericName: 'Paracetamol',
      manufacturer: 'Micro Labs Demo',
      strength: '500 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('18.00'),
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
    { sku: 'MED-ALP-05-001', saltLake: 50, howrah: 20, warehouse: 200 },
    { sku: 'MED-MET-10-001', saltLake: 10, howrah: 0, warehouse: 50 },
    { sku: 'MED-MOR-10-001', saltLake: 5, howrah: 0, warehouse: 20 },
    { sku: 'MED-UNK-001', saltLake: 30, howrah: 30, warehouse: 100 },
    { sku: 'MED-PAR-500-002', saltLake: 150, howrah: 100, warehouse: 500 },
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

  // 7. Seed Authentic Handwritten Prescriptions into MinIO and Database
  const minioClient = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER || 'minio_admin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio_admin_secret_key',
  });

  const rxBucket = process.env.MINIO_BUCKET_PRESCRIPTIONS || 'prescriptions';
  try {
    const rxBucketExists = await minioClient.bucketExists(rxBucket);
    if (!rxBucketExists) {
      await minioClient.makeBucket(rxBucket, 'us-east-1');
      if (isDev) console.log(`Created MinIO bucket: ${rxBucket}`);
    }
  } catch (err: any) {
    console.warn(`MinIO bucket init check: ${err?.message}`);
  }

  const mayaMember = await prisma.familyMember.findFirst({
    where: { customerUserId: customerUser.id, fullName: 'Maya Ghosh' },
  });
  const debasishAddress = await prisma.customerAddress.findFirst({
    where: { customerUserId: customerUser.id },
  });
  const rinaAddress = await prisma.customerAddress.findFirst({
    where: { customerUserId: customer2.id },
  });

  const prescriptionsToSeed = [
    {
      refKey: 'rx-maya-ghosh-chronic',
      fileName: 'rx-maya-ghosh-chronic.jpg',
      originalFileName: 'Dr-Banerjee-Rx-Maya-Ghosh.jpg',
      customerUserId: customerUser.id,
      familyMemberId: mayaMember ? mayaMember.id : null,
      status: PrescriptionStatus.APPROVED,
      objectKey: 'prescriptions/seed/rx-maya-ghosh-chronic.jpg',
      doctorName: 'Dr. A. K. Banerjee',
      patientName: 'Maya Ghosh',
      date: '2026-11-02',
      items: [
        { sku: 'MED-TEL-40-001', name: 'Telmisartan 40 mg', dosage: '1 tab OD (morning)', duration: '30 days' },
        { sku: 'MED-MET-500-001', name: 'Metformin 500 mg', dosage: '1 tab BD (after meals)', duration: '30 days' },
        { sku: 'MED-LEV-50-001', name: 'Levothyroxine 50 mcg', dosage: '1 tab OD (empty stomach)', duration: '60 days' },
      ],
    },
    {
      refKey: 'rx-debasish-amoxicillin-acute',
      fileName: 'rx-debasish-amoxicillin-acute.jpg',
      originalFileName: 'Dr-Mukherjee-Rx-Debasish.jpg',
      customerUserId: customerUser.id,
      familyMemberId: null,
      status: PrescriptionStatus.UNDER_REVIEW,
      objectKey: 'prescriptions/seed/rx-debasish-amoxicillin-acute.jpg',
      doctorName: 'Dr. S. Mukherjee',
      patientName: 'Debasish Ghosh',
      date: '2026-11-05',
      items: [
        { sku: 'MED-AMX-500-001', name: 'Amoxicillin 500 mg', dosage: '1 tab TDS x 5 days', duration: '5 days' },
        { sku: 'MED-PAR-500-002', name: 'Paracetamol 500 mg (Dolo Demo)', dosage: '1 tab SOS (fever/pain)', duration: '5 days' },
      ],
    },
    {
      refKey: 'rx-rina-sen-alprazolam-h1',
      fileName: 'rx-rina-sen-alprazolam-h1.jpg',
      originalFileName: 'Dr-Roy-Rx-Rina-Sen-H1.jpg',
      customerUserId: customer2.id,
      familyMemberId: null,
      status: PrescriptionStatus.UNDER_REVIEW,
      objectKey: 'prescriptions/seed/rx-rina-sen-alprazolam-h1.jpg',
      doctorName: 'Dr. Debnath Roy',
      patientName: 'Rina Sen',
      date: '2026-11-06',
      items: [
        { sku: 'MED-ALP-05-001', name: 'Alprazolam 0.5 mg', dosage: '1 tab HS x 7 days', duration: '7 days' },
        { sku: 'MED-PAR-500-002', name: 'Paracetamol 500 mg (Dolo Demo)', dosage: '1 tab SOS', duration: '5 days' },
      ],
    },
  ];

  const seededPrescriptions: Record<string, string> = {};

  for (const item of prescriptionsToSeed) {
    const filePath = path.join(__dirname, 'seed-data/prescriptions', item.fileName);
    let fileBuffer: Buffer;
    if (fs.existsSync(filePath)) {
      fileBuffer = fs.readFileSync(filePath);
    } else {
      fileBuffer = Buffer.from('Prescription Seed Image Fallback');
    }

    try {
      await minioClient.putObject(rxBucket, item.objectKey, fileBuffer, fileBuffer.length, {
        'Content-Type': 'image/jpeg',
        'X-Original-Filename': encodeURIComponent(item.originalFileName),
      });
      if (isDev) {
        console.log(`Uploaded prescription image to MinIO: ${item.objectKey} (${fileBuffer.length} bytes)`);
      }
    } catch (uploadErr: any) {
      console.warn(`MinIO upload warning for ${item.objectKey}: ${uploadErr.message}`);
    }

    const rxRecord = await prisma.prescription.upsert({
      where: { objectKey: item.objectKey },
      update: {
        customerUserId: item.customerUserId,
        familyMemberId: item.familyMemberId,
        originalFileName: item.originalFileName,
        mimeType: 'image/jpeg',
        fileSizeBytes: fileBuffer.length,
        status: item.status,
      },
      create: {
        customerUserId: item.customerUserId,
        familyMemberId: item.familyMemberId,
        objectKey: item.objectKey,
        originalFileName: item.originalFileName,
        mimeType: 'image/jpeg',
        fileSizeBytes: fileBuffer.length,
        status: item.status,
      },
    });

    seededPrescriptions[item.refKey] = rxRecord.id;

    // Seed structured AI extraction for realistic clinical assistance
    const existingAi = await prisma.prescriptionAIExtraction.findFirst({
      where: { prescriptionId: rxRecord.id },
    });
    if (!existingAi) {
      await prisma.prescriptionAIExtraction.create({
        data: {
          prescriptionId: rxRecord.id,
          status: PrescriptionAIStatus.COMPLETED,
          provider: 'GEMINI_LANGCHAIN',
          model: 'gemini-1.5-flash',
          documentReadable: true,
          overallConfidence: new Prisma.Decimal('0.95'),
          extractionResult: {
            prescriberName: item.doctorName,
            patientName: item.patientName,
            prescriptionDate: item.date,
            items: item.items.map((m) => ({
              rawMedicineName: m.name,
              normalizedMedicineName: m.name,
              dosageInstructions: m.dosage,
              duration: m.duration,
              confidence: 0.96,
            })),
          },
          matchingResult: {
            matchedCount: item.items.length,
            matches: item.items.map((m) => ({
              medicineId: seededMedicines[m.sku],
              sku: m.sku,
              confidence: 0.98,
            })),
          },
        },
      });
    }
  }

  // 8. Seed Clinical Demo Orders & Pharmacist Verification Queue
  const addressSnapshotDebasish = debasishAddress
    ? {
        label: debasishAddress.label,
        recipientName: debasishAddress.recipientName,
        phone: debasishAddress.phone,
        addressLine1: debasishAddress.addressLine1,
        city: debasishAddress.city,
        state: debasishAddress.state,
        postalCode: debasishAddress.postalCode,
      }
    : {
        label: 'Home',
        recipientName: 'Debasish Ghosh',
        phone: '9876543210',
        addressLine1: 'Plot 45, Sector I, Salt Lake',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700064',
      };

  const addressSnapshotRina = rinaAddress
    ? {
        label: rinaAddress.label,
        recipientName: rinaAddress.recipientName,
        phone: rinaAddress.phone,
        addressLine1: rinaAddress.addressLine1,
        city: rinaAddress.city,
        state: rinaAddress.state,
        postalCode: rinaAddress.postalCode,
      }
    : {
        label: 'Home (Howrah)',
        recipientName: 'Rina Sen',
        phone: '9876543211',
        addressLine1: '42, GT Road, Howrah Maidan',
        city: 'Howrah',
        state: 'West Bengal',
        postalCode: '711101',
      };

  // Demo Order 1: Acute Care Order (Debasish Ghosh) -> PENDING_VERIFICATION assigned to KOL-001
  const order1Number = 'ORD-2026-DEMO-01';
  const existingOrder1 = await prisma.order.findUnique({
    where: { orderNumber: order1Number },
  });

  if (!existingOrder1) {
    const medAmx = seededMedicines['MED-AMX-500-001'];
    const medPar = seededMedicines['MED-PAR-500-002'];

    const order1 = await prisma.order.create({
      data: {
        orderNumber: order1Number,
        customerUserId: customerUser.id,
        familyMemberId: null,
        prescriptionId: seededPrescriptions['rx-debasish-amoxicillin-acute'],
        addressId: debasishAddress?.id || null,
        status: OrderStatus.PENDING_VERIFICATION,
        fulfilmentStoreId: seededStores['KOL-001'],
        paymentMethod: OrderPaymentMethod.COD,
        paymentStatus: OrderPaymentStatus.PENDING,
        subtotal: new Prisma.Decimal('98.00'),
        deliveryFee: new Prisma.Decimal('0.00'),
        discount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('98.00'),
        addressSnapshot: addressSnapshotDebasish,
        customerNote: 'Please verify with doctor prescription attached.',
        placedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
      },
    });

    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order1.id,
          medicineId: medAmx,
          medicineNameSnapshot: 'Amoxicillin 500 mg',
          skuSnapshot: 'MED-AMX-500-001',
          unitPrice: new Prisma.Decimal('80.00'),
          quantity: 1,
          lineTotal: new Prisma.Decimal('80.00'),
          status: OrderItemStatus.PENDING_VERIFICATION,
        },
        {
          orderId: order1.id,
          medicineId: medPar,
          medicineNameSnapshot: 'Paracetamol 500 mg (Dolo Demo)',
          skuSnapshot: 'MED-PAR-500-002',
          unitPrice: new Prisma.Decimal('18.00'),
          quantity: 1,
          lineTotal: new Prisma.Decimal('18.00'),
          status: OrderItemStatus.PENDING_VERIFICATION,
        },
      ],
    });

    // Assign to KOL-001 store for Pharmacist Verification Queue
    await prisma.orderReviewAssignment.create({
      data: {
        orderId: order1.id,
        storeId: seededStores['KOL-001'],
        assignedByUserId: adminUser.id,
        reason: 'Automated clinical routing to nearest fulfillment store',
      },
    });

    await prisma.prescriptionReview.create({
      data: {
        prescriptionId: seededPrescriptions['rx-debasish-amoxicillin-acute'],
        orderId: order1.id,
        pharmacistId: pharmacistUser.id,
        storeId: seededStores['KOL-001'],
        status: PrescriptionReviewStatus.PENDING,
      },
    });
  }

  // Demo Order 2: Schedule H1 Restricted Order (Rina Sen) -> PENDING_VERIFICATION assigned to HOW-001
  const order2Number = 'ORD-2026-DEMO-02';
  const existingOrder2 = await prisma.order.findUnique({
    where: { orderNumber: order2Number },
  });

  if (!existingOrder2) {
    const medAlp = seededMedicines['MED-ALP-05-001'];
    const medPar = seededMedicines['MED-PAR-500-002'];

    const order2 = await prisma.order.create({
      data: {
        orderNumber: order2Number,
        customerUserId: customer2.id,
        familyMemberId: null,
        prescriptionId: seededPrescriptions['rx-rina-sen-alprazolam-h1'],
        addressId: rinaAddress?.id || null,
        status: OrderStatus.PENDING_VERIFICATION,
        fulfilmentStoreId: seededStores['HOW-001'],
        paymentMethod: OrderPaymentMethod.COD,
        paymentStatus: OrderPaymentStatus.PENDING,
        subtotal: new Prisma.Decimal('63.00'),
        deliveryFee: new Prisma.Decimal('0.00'),
        discount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('63.00'),
        addressSnapshot: addressSnapshotRina,
        customerNote: 'Schedule H1 medicine requested as per doctor slip.',
        placedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
      },
    });

    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order2.id,
          medicineId: medAlp,
          medicineNameSnapshot: 'Alprazolam 0.5 mg',
          skuSnapshot: 'MED-ALP-05-001',
          unitPrice: new Prisma.Decimal('45.00'),
          quantity: 1,
          lineTotal: new Prisma.Decimal('45.00'),
          status: OrderItemStatus.PENDING_VERIFICATION,
        },
        {
          orderId: order2.id,
          medicineId: medPar,
          medicineNameSnapshot: 'Paracetamol 500 mg (Dolo Demo)',
          skuSnapshot: 'MED-PAR-500-002',
          unitPrice: new Prisma.Decimal('18.00'),
          quantity: 1,
          lineTotal: new Prisma.Decimal('18.00'),
          status: OrderItemStatus.PENDING_VERIFICATION,
        },
      ],
    });

    await prisma.orderReviewAssignment.create({
      data: {
        orderId: order2.id,
        storeId: seededStores['HOW-001'],
        assignedByUserId: adminUser.id,
        reason: 'Howrah region fulfillment routing',
      },
    });

    await prisma.prescriptionReview.create({
      data: {
        prescriptionId: seededPrescriptions['rx-rina-sen-alprazolam-h1'],
        orderId: order2.id,
        pharmacistId: pharmacistUser.id,
        storeId: seededStores['HOW-001'],
        status: PrescriptionReviewStatus.PENDING,
      },
    });
  }

  // Demo Order 3: Delivered Chronic Refill (Debasish for Maya Ghosh)
  const order3Number = 'ORD-2026-DEMO-03';
  const existingOrder3 = await prisma.order.findUnique({
    where: { orderNumber: order3Number },
  });

  if (!existingOrder3) {
    const medTel = seededMedicines['MED-TEL-40-001'];
    const medMet = seededMedicines['MED-MET-500-001'];

    const order3 = await prisma.order.create({
      data: {
        orderNumber: order3Number,
        customerUserId: customerUser.id,
        familyMemberId: mayaMember ? mayaMember.id : null,
        prescriptionId: seededPrescriptions['rx-maya-ghosh-chronic'],
        addressId: debasishAddress?.id || null,
        status: OrderStatus.DELIVERED,
        fulfilmentStoreId: seededStores['KOL-001'],
        paymentMethod: OrderPaymentMethod.UPI,
        paymentStatus: OrderPaymentStatus.SUCCESS,
        subtotal: new Prisma.Decimal('125.00'),
        deliveryFee: new Prisma.Decimal('0.00'),
        discount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('125.00'),
        addressSnapshot: addressSnapshotDebasish,
        customerNote: 'Monthly chronic care refill for Maya Ghosh.',
        placedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      },
    });

    const itemTel = await prisma.orderItem.create({
      data: {
        orderId: order3.id,
        medicineId: medTel,
        medicineNameSnapshot: 'Telmisartan 40 mg',
        skuSnapshot: 'MED-TEL-40-001',
        unitPrice: new Prisma.Decimal('95.00'),
        quantity: 1,
        lineTotal: new Prisma.Decimal('95.00'),
        status: OrderItemStatus.APPROVED,
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order3.id,
        medicineId: medMet,
        medicineNameSnapshot: 'Metformin 500 mg',
        skuSnapshot: 'MED-MET-500-001',
        unitPrice: new Prisma.Decimal('30.00'),
        quantity: 1,
        lineTotal: new Prisma.Decimal('30.00'),
        status: OrderItemStatus.APPROVED,
      },
    });

    // Seed Refill Estimate & Active Refill Subscription for Maya Ghosh
    const existingSub = await prisma.refillSubscription.findFirst({
      where: {
        customerId: customerUser.id,
        medicineId: medTel,
      },
    });

    if (!existingSub) {
      const estimate = await prisma.refillEstimate.create({
        data: {
          orderItemId: itemTel.id,
          customerId: customerUser.id,
          familyMemberId: mayaMember ? mayaMember.id : null,
          medicineId: medTel,
          dispensedQuantity: 30,
          dailyConsumption: new Prisma.Decimal('1.00'),
          estimatedSupplyDays: new Prisma.Decimal('30.00'),
          dispensedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          estimatedRunOutAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          eligibilityStatus: RefillEligibilityStatus.ELIGIBLE,
          calculationInputs: { dailyDose: 1, packQuantity: 30 },
        },
      });

      await prisma.refillSubscription.create({
        data: {
          customerId: customerUser.id,
          familyMemberId: mayaMember ? mayaMember.id : null,
          medicineId: medTel,
          refillEstimateId: estimate.id,
          status: RefillSubscriptionStatus.ACTIVE,
          reminderDaysBefore: 5,
        },
      });
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
    console.log('Medicines: 11 demo medicines catalogue seeded.');
    console.log('Inventory: Balances & Opening stock movements verified.');
    console.log('Prescriptions: 3 authentic handwritten doctor prescriptions uploaded to MinIO & database.');
    console.log('Orders & Reviews:');
    console.log('  - ORD-2026-DEMO-01: Debasish Ghosh (Acute Care) -> Assigned to KOL-001 Pharmacist Review Queue');
    console.log('  - ORD-2026-DEMO-02: Rina Sen (Schedule H1 Care) -> Assigned to HOW-001 Pharmacist Review Queue');
    console.log('  - ORD-2026-DEMO-03: Maya Ghosh (Delivered Chronic Refill) -> Active Refill Subscription');
    console.log('Demo Accounts:');
    console.log('  - CUSTOMER:         Email: customer@example.com, Pass: DemoPassword123! (Phone: 9876543210, Mock OTP: 123456)');
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
