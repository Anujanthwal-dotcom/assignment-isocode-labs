import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
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
  ],
  providers: [
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
