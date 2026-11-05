import { PrismaClient, UserRole, UserStatus, StoreStatus } from '@prisma/client';
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

  // 2. Hash Default Staff Password using Argon2id
  const staffPassword = 'DemoPassword123!';
  const passwordHash = await argon2.hash(staffPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 3. Seed Users
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
  await prisma.user.upsert({
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

  if (isDev) {
    console.log('✅ Database seeded successfully:');
    console.log('--------------------------------------------------');
    console.log('Stores:');
    console.log('  - KOL-001: Salt Lake Store (Kolkata)');
    console.log('  - HOW-001: Howrah Maidan Store (Howrah)');
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
