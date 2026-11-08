import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { StoresModule } from './stores/stores.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { MedicinesModule } from './medicines/medicines.module';
import { InventoryModule } from './inventory/inventory.module';
import { InventoryImportsModule } from './inventory-imports/inventory-imports.module';
import { CustomerMedicinesModule } from './customer/customer-medicines.module';
import { FamilyMembersModule } from './family-members/family-members.module';
import { CustomerAddressesModule } from './customer-addresses/customer-addresses.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PrescriptionAiModule } from './prescription-ai/prescription-ai.module';
import { ComplianceModule } from './compliance/compliance.module';
import { ReviewAssignmentModule } from './review-assignments/review-assignment.module';
import { PharmacistVerificationModule } from './pharmacist-verification/pharmacist-verification.module';
import { OrderRoutingModule } from './order-routing/order-routing.module';
import { FulfilmentModule } from './fulfilment/fulfilment.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RefillsModule } from './refills/refills.module';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: config.get<string>('nodeEnv') === 'test' ? 2000 : 120,
          },
        ],
      }),
    }),
    PrismaModule,
    AuditModule,
    UsersModule,
    StoresModule,
    WarehousesModule,
    MedicinesModule,
    InventoryModule,
    InventoryImportsModule,
    StorageModule,
    AuthModule,
    HealthModule,
    CustomerMedicinesModule,
    FamilyMembersModule,
    CustomerAddressesModule,
    PrescriptionsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    PrescriptionAiModule,
    ComplianceModule,
    ReviewAssignmentModule,
    PharmacistVerificationModule,
    OrderRoutingModule,
    FulfilmentModule,
    NotificationsModule,
    RefillsModule,
    AdminAnalyticsModule,
    RedisModule,
    MailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
