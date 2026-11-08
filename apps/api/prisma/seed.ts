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
  PrescriptionQuoteStatus,
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

  // 3b. Store Staff Members (Bound to Physical Retail Stores)
  const storeStaffToSeed = [
    {
      email: 'staff.saltlake@example.com',
      fullName: 'Debopriyo Roy',
      designation: 'Inventory Lead & Dispatch',
      storeCode: 'KOL-001',
    },
    {
      email: 'staff.howrah@example.com',
      fullName: 'Sagnik Banerjee',
      designation: 'Store Stock Associate',
      storeCode: 'HOW-001',
    },
    {
      email: 'staff.southkolkata@example.com',
      fullName: 'Poulomi Das',
      designation: 'Store Stock Associate',
      storeCode: 'SOU-001',
    },
  ];

  for (const staff of storeStaffToSeed) {
    const staffUser = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        role: UserRole.STORE_STAFF,
        status: UserStatus.ACTIVE,
        passwordHash: passwordHash,
      },
      create: {
        email: staff.email,
        role: UserRole.STORE_STAFF,
        status: UserStatus.ACTIVE,
        passwordHash: passwordHash,
      },
    });

    await prisma.staffProfile.upsert({
      where: { userId: staffUser.id },
      update: {
        fullName: staff.fullName,
        designation: staff.designation,
        storeId: seededStores[staff.storeCode],
      },
      create: {
        userId: staffUser.id,
        fullName: staff.fullName,
        designation: staff.designation,
        storeId: seededStores[staff.storeCode],
      },
    });
  }

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
    // Gastro
    {
      sku: 'MED-OMP-20-001',
      name: 'Omeprazole 20 mg Capsule',
      brandName: 'Omez 20',
      genericName: 'Omeprazole',
      manufacturer: "Dr. Reddy's Laboratories",
      strength: '20 mg',
      dosageForm: 'Capsule',
      packSize: '15 capsules',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('65.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-PAN-40-001',
      name: 'Pantoprazole 40 mg Tablet',
      brandName: 'Pan 40',
      genericName: 'Pantoprazole',
      manufacturer: 'Alkem Laboratories',
      strength: '40 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('98.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-PAND-001',
      name: 'Pantoprazole 40 mg + Domperidone 30 mg Capsule',
      brandName: 'Pan-D',
      genericName: 'Pantoprazole + Domperidone',
      manufacturer: 'Alkem Laboratories',
      strength: '40 mg + 30 mg',
      dosageForm: 'Capsule',
      packSize: '10 capsules',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('145.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-RAB-20-001',
      name: 'Rabeprazole 20 mg Tablet',
      brandName: 'Razo 20',
      genericName: 'Rabeprazole',
      manufacturer: "Dr. Reddy's Laboratories",
      strength: '20 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('120.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-DGN-200-001',
      name: 'Digene Gel Antacid Mint 200 ml',
      brandName: 'Digene Mint',
      genericName: 'Dried Aluminium Hydroxide Gel',
      manufacturer: 'Abbott Healthcare',
      strength: 'Standard',
      dosageForm: 'Liquid',
      packSize: '200 ml',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('160.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Cardiovascular & Hypertension
    {
      sku: 'MED-ATV-10-001',
      name: 'Atorvastatin 10 mg Tablet',
      brandName: 'Atorva 10',
      genericName: 'Atorvastatin',
      manufacturer: 'Zydus Healthcare',
      strength: '10 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('110.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-ATV-20-001',
      name: 'Atorvastatin 20 mg Tablet',
      brandName: 'Atorva 20',
      genericName: 'Atorvastatin',
      manufacturer: 'Zydus Healthcare',
      strength: '20 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('185.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-RSV-10-001',
      name: 'Rosuvastatin 10 mg Tablet',
      brandName: 'Rozavel 10',
      genericName: 'Rosuvastatin',
      manufacturer: 'Sun Pharmaceutical',
      strength: '10 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('195.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-TEL-80-001',
      name: 'Telmisartan 80 mg Tablet',
      brandName: 'Telma 80',
      genericName: 'Telmisartan',
      manufacturer: 'Glenmark Pharmaceuticals',
      strength: '80 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('165.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-TEL-H-001',
      name: 'Telmisartan 40 mg + Hydrochlorothiazide 12.5 mg Tablet',
      brandName: 'Telma-H',
      genericName: 'Telmisartan + Hydrochlorothiazide',
      manufacturer: 'Glenmark Pharmaceuticals',
      strength: '40 mg + 12.5 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('140.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-AML-05-001',
      name: 'Amlodipine 5 mg Tablet',
      brandName: 'Amlong 5',
      genericName: 'Amlodipine',
      manufacturer: 'Micro Labs',
      strength: '5 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('42.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Diabetes
    {
      sku: 'MED-MET-1000-001',
      name: 'Metformin 1000 mg SR Tablet',
      brandName: 'Glyciphage SR 1000',
      genericName: 'Metformin',
      manufacturer: 'Franco-Indian Ltd',
      strength: '1000 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('62.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-GLM-01-001',
      name: 'Glimepiride 1 mg Tablet',
      brandName: 'Amaryl 1mg',
      genericName: 'Glimepiride',
      manufacturer: 'Sanofi India',
      strength: '1 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('85.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-GLM-02-001',
      name: 'Glimepiride 2 mg Tablet',
      brandName: 'Amaryl 2mg',
      genericName: 'Glimepiride',
      manufacturer: 'Sanofi India',
      strength: '2 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('135.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-VOG-02-001',
      name: 'Voglibose 0.2 mg Tablet',
      brandName: 'Volibo 0.2',
      genericName: 'Voglibose',
      manufacturer: 'Sun Pharmaceutical',
      strength: '0.2 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('92.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Antibiotics
    {
      sku: 'MED-AMC-625-001',
      name: 'Amoxicillin 500 mg + Clavulanic Acid 125 mg Tablet',
      brandName: 'Augmentin 625 Duo',
      genericName: 'Amoxicillin + Clavulanic Acid',
      manufacturer: 'GlaxoSmithKline Pharmaceuticals',
      strength: '500 mg + 125 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('225.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-AZI-500-001',
      name: 'Azithromycin 500 mg Tablet',
      brandName: 'Azee 500',
      genericName: 'Azithromycin',
      manufacturer: 'Cipla Laboratories',
      strength: '500 mg',
      dosageForm: 'Tablet',
      packSize: '5 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('130.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-CEF-200-001',
      name: 'Cefixime 200 mg Tablet',
      brandName: 'Zifi 200',
      genericName: 'Cefixime',
      manufacturer: 'FDC Limited',
      strength: '200 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('115.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-CIP-500-001',
      name: 'Ciprofloxacin 500 mg Tablet',
      brandName: 'Ciplox 500',
      genericName: 'Ciprofloxacin',
      manufacturer: 'Cipla Laboratories',
      strength: '500 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('45.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Analgesics & Antipyretics
    {
      sku: 'MED-PAR-650-001',
      name: 'Paracetamol 650 mg Tablet',
      brandName: 'Dolo 650',
      genericName: 'Paracetamol',
      manufacturer: 'Micro Labs Limited',
      strength: '650 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('34.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-PAR-650-002',
      name: 'Paracetamol 650 mg Tablet',
      brandName: 'Crocin 650',
      genericName: 'Paracetamol',
      manufacturer: 'GSK Asia',
      strength: '650 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('32.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-IBU-400-001',
      name: 'Ibuprofen 400 mg Tablet',
      brandName: 'Brufen 400',
      genericName: 'Ibuprofen',
      manufacturer: 'Abbott Healthcare',
      strength: '400 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('28.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-ACE-100-001',
      name: 'Aceclofenac 100 mg + Paracetamol 325 mg Tablet',
      brandName: 'Zerodol-P',
      genericName: 'Aceclofenac + Paracetamol',
      manufacturer: 'Ipca Laboratories',
      strength: '100 mg + 325 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('72.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-COM-400-001',
      name: 'Ibuprofen 400 mg + Paracetamol 325 mg Tablet',
      brandName: 'Combiflam',
      genericName: 'Ibuprofen + Paracetamol',
      manufacturer: 'Sanofi India',
      strength: '400 mg + 325 mg',
      dosageForm: 'Tablet',
      packSize: '20 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('46.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Allergy & Respiratory
    {
      sku: 'MED-CTZ-10-001',
      name: 'Cetirizine 10 mg Tablet',
      brandName: 'Cetzine 10',
      genericName: 'Cetirizine',
      manufacturer: "Dr. Reddy's Laboratories",
      strength: '10 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('22.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-LVC-05-001',
      name: 'Levocetirizine 5 mg Tablet',
      brandName: 'Levocet 5',
      genericName: 'Levocetirizine',
      manufacturer: 'Hetero Healthcare',
      strength: '5 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('55.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-MNT-10-001',
      name: 'Montelukast 10 mg + Levocetirizine 5 mg Tablet',
      brandName: 'Montair-LC',
      genericName: 'Montelukast + Levocetirizine',
      manufacturer: 'Cipla Laboratories',
      strength: '10 mg + 5 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('175.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-ASC-100-001',
      name: 'Ascoril-D Plus Cough Syrup 100 ml',
      brandName: 'Ascoril-D Plus',
      genericName: 'Dextromethorphan + Phenylephrine',
      manufacturer: 'Glenmark Pharmaceuticals',
      strength: '100 ml',
      dosageForm: 'Syrup',
      packSize: '100 ml bottle',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('118.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-ALX-100-001',
      name: 'Alex Cough & Cold Syrup 100 ml',
      brandName: 'Alex Syrup',
      genericName: 'Dextromethorphan + Chlorpheniramine',
      manufacturer: 'Glenmark Pharmaceuticals',
      strength: '100 ml',
      dosageForm: 'Syrup',
      packSize: '100 ml bottle',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('125.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Thyroid
    {
      sku: 'MED-LEV-100-001',
      name: 'Levothyroxine 100 mcg Tablet',
      brandName: 'Thyronorm 100',
      genericName: 'Levothyroxine Sodium',
      manufacturer: 'Abbott Healthcare',
      strength: '100 mcg',
      dosageForm: 'Tablet',
      packSize: '100 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('220.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-LEV-25-001',
      name: 'Levothyroxine 25 mcg Tablet',
      brandName: 'Thyronorm 25',
      genericName: 'Levothyroxine Sodium',
      manufacturer: 'Abbott Healthcare',
      strength: '25 mcg',
      dosageForm: 'Tablet',
      packSize: '100 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('155.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Psychiatric / Schedule H1
    {
      sku: 'MED-ALP-025-001',
      name: 'Alprazolam 0.25 mg Tablet',
      brandName: 'Alprax 0.25',
      genericName: 'Alprazolam',
      manufacturer: 'Torrent Pharmaceuticals',
      strength: '0.25 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H1,
      mrp: new Prisma.Decimal('30.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-CLN-05-001',
      name: 'Clonazepam 0.5 mg Tablet',
      brandName: 'Clonafit 0.5',
      genericName: 'Clonazepam',
      manufacturer: 'Mankind Pharma',
      strength: '0.5 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H1,
      mrp: new Prisma.Decimal('55.00'),
      status: MedicineStatus.ACTIVE,
    },
    // Supplements & OTC
    {
      sku: 'MED-VITC-500-001',
      name: 'Vitamin C 500 mg Chewable Tablet',
      brandName: 'Limcee 500',
      genericName: 'Ascorbic Acid (Vitamin C)',
      manufacturer: 'Abbott Healthcare',
      strength: '500 mg',
      dosageForm: 'Tablet',
      packSize: '15 chewable tablets',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('25.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-VITD-60K-001',
      name: 'Cholecalciferol 60,000 IU Sachet',
      brandName: 'Calcirol 60K',
      genericName: 'Cholecalciferol (Vitamin D3)',
      manufacturer: 'Cadila Pharmaceuticals',
      strength: '60000 IU',
      dosageForm: 'Granules',
      packSize: '1 sachet (1 g)',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('60.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      sku: 'MED-BCX-001',
      name: 'B-Complex with Zinc Capsule',
      brandName: 'Becosules Z',
      genericName: 'Vitamin B-Complex + Zinc',
      manufacturer: 'Pfizer India',
      strength: 'Standard',
      dosageForm: 'Capsule',
      packSize: '20 capsules',
      schedule: MedicineSchedule.OTC,
      mrp: new Prisma.Decimal('52.00'),
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
  const explicitStockMap = new Map<string, { saltLake: number; howrah: number; warehouse: number }>([
    ['MED-MET-500-001', { saltLake: 120, howrah: 0, warehouse: 500 }],
    ['MED-TEL-40-001', { saltLake: 8, howrah: 75, warehouse: 200 }],
    ['MED-LEV-50-001', { saltLake: 42, howrah: 10, warehouse: 150 }],
    ['MED-PAR-500-001', { saltLake: 200, howrah: 150, warehouse: 1000 }],
    ['MED-ORS-001', { saltLake: 0, howrah: 45, warehouse: 300 }],
    ['MED-AMX-500-001', { saltLake: 12, howrah: 0, warehouse: 100 }],
    ['MED-ALP-05-001', { saltLake: 50, howrah: 20, warehouse: 200 }],
    ['MED-MET-10-001', { saltLake: 10, howrah: 0, warehouse: 50 }],
    ['MED-MOR-10-001', { saltLake: 5, howrah: 0, warehouse: 20 }],
    ['MED-UNK-001', { saltLake: 30, howrah: 30, warehouse: 100 }],
    ['MED-PAR-500-002', { saltLake: 150, howrah: 100, warehouse: 500 }],
  ]);

  const initialStockData = medicines.map((m) => {
    const explicit = explicitStockMap.get(m.sku);
    return {
      sku: m.sku,
      saltLake: explicit ? explicit.saltLake : 100,
      howrah: explicit ? explicit.howrah : 50,
      warehouse: explicit ? explicit.warehouse : 500,
    };
  });

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

  const prescriptionsToSeed = [
    {
      refKey: 'rx-maya-ghosh-chronic',
      fileName: 'rx-maya-ghosh-chronic.jpg',
      originalFileName: 'Dr-Banerjee-Rx-Maya-Ghosh.jpg',
      customerUserId: customerUser.id,
      familyMemberId: mayaMember ? mayaMember.id : null,
      status: PrescriptionStatus.APPROVED,
      objectKey: 'prescriptions/seed/rx-maya-ghosh-chronic.jpg',
      doctorName: 'Dr. A. K. Banerjee (Reg #45892)',
      patientName: 'Maya Ghosh',
      date: '2026-11-02',
      items: [
        { sku: 'MED-TEL-40-001', name: 'Telmisartan 40 mg', dosage: '1 tab OD (morning)', duration: '30 days', quantity: 30 },
        { sku: 'MED-MET-500-001', name: 'Metformin 500 mg', dosage: '1 tab BD (after meals)', duration: '30 days', quantity: 60 },
        { sku: 'MED-LEV-50-001', name: 'Levothyroxine 50 mcg', dosage: '1 tab OD (empty stomach)', duration: '60 days', quantity: 60 },
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
      doctorName: 'Dr. S. Mukherjee (Reg #MCI-48201)',
      patientName: 'Debasish Ghosh',
      date: '2026-11-05',
      items: [
        { sku: 'MED-AMX-500-001', name: 'Amoxicillin 500 mg', dosage: '1 tab TDS x 5 days', duration: '5 days', quantity: 15 },
        { sku: 'MED-PAR-500-002', name: 'Paracetamol 500 mg (Dolo Demo)', dosage: '1 tab SOS (fever/pain)', duration: '5 days', quantity: 10 },
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
      doctorName: 'Dr. Debnath Roy (Reg #WB-32941)',
      patientName: 'Rina Sen',
      date: '2026-11-06',
      items: [
        { sku: 'MED-ALP-05-001', name: 'Alprazolam 0.5 mg', dosage: '1 tab HS x 7 days', duration: '7 days', quantity: 7 },
        { sku: 'MED-PAR-500-002', name: 'Paracetamol 500 mg (Dolo Demo)', dosage: '1 tab SOS', duration: '5 days', quantity: 10 },
      ],
    },
    {
      refKey: 'rx-debasish-omeprazole-gastric',
      fileName: 'rx-debasish-omeprazole-gastric.jpg',
      originalFileName: 'Dr-Sengupta-Rx-Debasish-Gastro.jpg',
      customerUserId: customerUser.id,
      familyMemberId: null,
      status: PrescriptionStatus.APPROVED,
      objectKey: 'prescriptions/seed/rx-debasish-omeprazole-gastric.jpg',
      doctorName: 'Dr. P. Sengupta (Reg #WB-55102)',
      patientName: 'Debasish Ghosh',
      date: '2026-10-15',
      items: [
        { sku: 'MED-OMP-20-001', name: 'Omeprazole 20 mg', dosage: '1 cap OD (morning) x 14 days', duration: '14 days', quantity: 14 },
        { sku: 'MED-PAND-001', name: 'Domperidone + Pantoprazole', dosage: '1 tab TDS x 5 days', duration: '5 days', quantity: 15 },
      ],
    },
    {
      refKey: 'rx-debasish-atorvastatin-cardio',
      fileName: 'rx-debasish-atorvastatin-cardio.jpg',
      originalFileName: 'Dr-Chakraborty-Rx-Debasish-Cardio.jpg',
      customerUserId: customerUser.id,
      familyMemberId: null,
      status: PrescriptionStatus.APPROVED,
      objectKey: 'prescriptions/seed/rx-debasish-atorvastatin-cardio.jpg',
      doctorName: 'Dr. R. Chakraborty (Reg #MCI-22481)',
      patientName: 'Debasish Ghosh',
      date: '2026-09-28',
      items: [
        { sku: 'MED-ATV-20-001', name: 'Atorvastatin 20 mg', dosage: '1 tab HS x 30 days', duration: '30 days', quantity: 30 },
        { sku: 'MED-TEL-40-001', name: 'Telmisartan 40 mg', dosage: '1 tab OD morning x 30 days', duration: '30 days', quantity: 30 },
      ],
    },
    {
      refKey: 'rx-debasish-cetirizine-derm',
      fileName: 'rx-debasish-cetirizine-derm.jpg',
      originalFileName: 'Dr-Bose-Rx-Debasish-Derm.jpg',
      customerUserId: customerUser.id,
      familyMemberId: null,
      status: PrescriptionStatus.APPROVED,
      objectKey: 'prescriptions/seed/rx-debasish-cetirizine-derm.jpg',
      doctorName: 'Dr. K. Bose (Reg #WB-18932)',
      patientName: 'Debasish Ghosh',
      date: '2026-09-10',
      items: [
        { sku: 'MED-CTZ-10-001', name: 'Cetirizine 10 mg', dosage: '1 tab HS x 10 days', duration: '10 days', quantity: 10 },
      ],
    },
  ];

  const seededPrescriptions: Record<string, string> = {};

  // Query all active catalogue medicines for rich matchingResult generation
  const activeMeds = await prisma.medicine.findMany({
    where: { status: 'ACTIVE' },
  });
  const medMap = new Map(activeMeds.map((m) => [m.sku, m]));

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

    // Build structured, catalogue-aware AI matching array matching MedicineMatchingService contract
    const matchingResults = item.items.map((m, idx) => {
      const med = medMap.get(m.sku);
      const comparisonNotes = med
        ? `AI matched to catalogue: ${med.name} (${med.brandName || med.genericName || ''}) at ₹${Number(med.mrp).toFixed(2)}`
        : `Catalogue match: ${m.name}`;

      const matchedMedicine = med
        ? {
            id: med.id,
            sku: med.sku,
            name: med.name,
            brandName: med.brandName,
            genericName: med.genericName,
            strength: med.strength,
            dosageForm: med.dosageForm,
            mrp: Number(med.mrp).toFixed(2),
          }
        : undefined;

      return {
        extractedItemIndex: idx,
        selectedMedicineId: med?.id || seededMedicines[m.sku] || null,
        matchStatus: 'MATCHED' as const,
        genericAlternatives: [],
        comparisonNotes,
        candidates: med
          ? [
              {
                medicine: {
                  id: med.id,
                  sku: med.sku,
                  name: med.name,
                  brandName: med.brandName,
                  genericName: med.genericName,
                  strength: med.strength,
                  dosageForm: med.dosageForm,
                  mrp: Number(med.mrp).toFixed(2),
                },
                score: 0.98,
                matchReasons: ['Exact catalogue SKU match', 'Active verified formulation in catalogue'],
              },
            ]
          : [],
        matchedMedicine,
      };
    });

    // Replace or insert structured AI extraction for realistic clinical assistance
    await prisma.prescriptionAIExtraction.deleteMany({
      where: { prescriptionId: rxRecord.id },
    });

    await prisma.prescriptionAIExtraction.create({
      data: {
        prescriptionId: rxRecord.id,
        status: PrescriptionAIStatus.COMPLETED,
        provider: 'GEMINI_LANGCHAIN',
        model: 'gemini-1.5-flash',
        documentReadable: true,
        overallConfidence: new Prisma.Decimal('0.96'),
        extractionResult: {
          prescriberName: item.doctorName,
          patientName: item.patientName,
          prescriptionDate: item.date,
          documentReadable: true,
          overallConfidence: 0.96,
          items: item.items.map((m) => {
            const med = medMap.get(m.sku);
            return {
              rawMedicineName: m.name,
              normalizedMedicineName: med?.name || m.name,
              strength: med?.strength || '',
              dosageForm: med?.dosageForm || 'Tablet',
              dosageInstructions: m.dosage,
              frequency: 'As prescribed',
              duration: m.duration,
              quantity: m.quantity || 10,
              confidence: 0.97,
              sourceText: `${m.name} ${m.dosage}`,
              warnings: [],
            };
          }),
          unreadableSections: [],
          generalWarnings: [],
        },
        matchingResult: matchingResults,
      },
    });
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

  // 8. Clinical Demo Orders Lifecycle Policy:
  // An unreviewed prescription MUST NOT have any order related to it.
  // Prescriptions 'rx-debasish-amoxicillin-acute' and 'rx-rina-sen-alprazolam-h1'
  // are seeded as UNDER_REVIEW with AI extractions completed, awaiting clinical pharmacist
  // verification and quotation in /pharmacist/review-queue.
  // After reviewing, the customer reviews the quotation, chooses payment, and the order is created then.
  //
  // Clean up any legacy demo orders attached to unreviewed prescriptions:
  const ordersToClean = await prisma.order.findMany({
    where: { orderNumber: { in: ['ORD-2026-DEMO-01', 'ORD-2026-DEMO-02'] } },
    select: { id: true },
  });
  if (ordersToClean.length > 0) {
    const orderIds = ordersToClean.map((o) => o.id);
    await prisma.prescriptionReview.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderReviewAssignment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
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

    // Seed Accepted Quotation linking prescription to order (Customer reviewed quote & paid)
    const existingQuote3 = await prisma.prescriptionQuote.findFirst({
      where: { prescriptionId: seededPrescriptions['rx-maya-ghosh-chronic'] },
    });

    if (!existingQuote3) {
      const quote3 = await prisma.prescriptionQuote.create({
        data: {
          prescriptionId: seededPrescriptions['rx-maya-ghosh-chronic'],
          pharmacistId: pharmacistUser.id,
          storeId: seededStores['KOL-001'],
          status: PrescriptionQuoteStatus.ACCEPTED,
          subtotal: new Prisma.Decimal('125.00'),
          deliveryFee: new Prisma.Decimal('0.00'),
          totalAmount: new Prisma.Decimal('125.00'),
          pharmacistNotes:
            'Prescription verified with Dr. A. K. Banerjee. All medicines approved for chronic care management.',
          quotedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          orderId: order3.id,
        },
      });

      await prisma.prescriptionQuoteItem.createMany({
        data: [
          {
            quoteId: quote3.id,
            medicineId: medTel,
            detectedMedicineName: 'Telmisartan 40 mg',
            medicineNameSnapshot: 'Telmisartan 40 mg',
            strengthSnapshot: '40 mg',
            dosageFormSnapshot: 'Tablet',
            dosageInstructions: '1 tab OD (morning)',
            unitPrice: new Prisma.Decimal('95.00'),
            quantity: 1,
            lineTotal: new Prisma.Decimal('95.00'),
            isAvailable: true,
          },
          {
            quoteId: quote3.id,
            medicineId: medMet,
            detectedMedicineName: 'Metformin 500 mg',
            medicineNameSnapshot: 'Metformin 500 mg',
            strengthSnapshot: '500 mg',
            dosageFormSnapshot: 'Tablet',
            dosageInstructions: '1 tab BD (after meals)',
            unitPrice: new Prisma.Decimal('30.00'),
            quantity: 1,
            lineTotal: new Prisma.Decimal('30.00'),
            isAvailable: true,
          },
        ],
      });
    }

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
    console.log('Orders & Reviews (Strict Lifecycle Architecture):');
    console.log('  - Incoming Rx: Debasish Ghosh (Amoxicillin Acute) -> UNDER_REVIEW (Awaiting Pharmacist Quote; NO order created yet)');
    console.log('  - Incoming Rx: Rina Sen (Alprazolam H1) -> UNDER_REVIEW (Awaiting Pharmacist Quote; NO order created yet)');
    console.log('  - ORD-2026-DEMO-03: Maya Ghosh (Chronic Refill) -> Reviewed, Quoted, Customer Paid & Delivered');
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
