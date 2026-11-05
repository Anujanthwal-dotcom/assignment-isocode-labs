-- CreateEnum
CREATE TYPE "MedicineStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MedicineSchedule" AS ENUM ('OTC', 'SCHEDULE_H', 'SCHEDULE_H1', 'SCHEDULE_X', 'NARCOTIC', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InventoryLocationType" AS ENUM ('STORE', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('OPENING_STOCK', 'STOCK_IMPORT', 'MANUAL_ADJUSTMENT', 'STOCK_CORRECTION');

-- CreateEnum
CREATE TYPE "InventoryImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "InventoryImportRowStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandName" TEXT,
    "genericName" TEXT,
    "manufacturer" TEXT,
    "strength" TEXT,
    "dosageForm" TEXT,
    "packSize" TEXT,
    "schedule" "MedicineSchedule" NOT NULL DEFAULT 'UNKNOWN',
    "mrp" DECIMAL(10,2) NOT NULL,
    "status" "MedicineStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_balances" (
    "id" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "storeId" UUID,
    "warehouseId" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "storeId" UUID,
    "warehouseId" UUID,
    "movementType" "InventoryMovementType" NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "performedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_imports" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileObjectKey" TEXT,
    "locationType" "InventoryLocationType" NOT NULL,
    "storeId" UUID,
    "warehouseId" UUID,
    "status" "InventoryImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "appliedRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" JSONB,
    "importedByUserId" UUID NOT NULL,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_import_rows" (
    "id" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "medicineId" UUID,
    "quantity" INTEGER,
    "status" "InventoryImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_sku_key" ON "medicines"("sku");

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_genericName_idx" ON "medicines"("genericName");

-- CreateIndex
CREATE INDEX "medicines_brandName_idx" ON "medicines"("brandName");

-- CreateIndex
CREATE INDEX "medicines_status_idx" ON "medicines"("status");

-- CreateIndex
CREATE INDEX "inventory_balances_medicineId_idx" ON "inventory_balances"("medicineId");

-- CreateIndex
CREATE INDEX "inventory_balances_storeId_idx" ON "inventory_balances"("storeId");

-- CreateIndex
CREATE INDEX "inventory_balances_warehouseId_idx" ON "inventory_balances"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_balances_quantity_reorderLevel_idx" ON "inventory_balances"("quantity", "reorderLevel");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_medicineId_storeId_key" ON "inventory_balances"("medicineId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_medicineId_warehouseId_key" ON "inventory_balances"("medicineId", "warehouseId");

-- CreateIndex
CREATE INDEX "inventory_movements_medicineId_createdAt_idx" ON "inventory_movements"("medicineId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_storeId_createdAt_idx" ON "inventory_movements"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_warehouseId_createdAt_idx" ON "inventory_movements"("warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_movementType_createdAt_idx" ON "inventory_movements"("movementType", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_performedByUserId_createdAt_idx" ON "inventory_movements"("performedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_imports_status_createdAt_idx" ON "inventory_imports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_imports_storeId_idx" ON "inventory_imports"("storeId");

-- CreateIndex
CREATE INDEX "inventory_imports_warehouseId_idx" ON "inventory_imports"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_imports_importedByUserId_createdAt_idx" ON "inventory_imports"("importedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_import_rows_importId_status_idx" ON "inventory_import_rows"("importId", "status");

-- CreateIndex
CREATE INDEX "inventory_import_rows_sku_idx" ON "inventory_import_rows"("sku");

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_imports" ADD CONSTRAINT "inventory_imports_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_imports" ADD CONSTRAINT "inventory_imports_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_imports" ADD CONSTRAINT "inventory_imports_importedByUserId_fkey" FOREIGN KEY ("importedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_import_rows" ADD CONSTRAINT "inventory_import_rows_importId_fkey" FOREIGN KEY ("importId") REFERENCES "inventory_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_import_rows" ADD CONSTRAINT "inventory_import_rows_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom Business Logic Check Constraints (Phase 2)
ALTER TABLE "inventory_balances" ADD CONSTRAINT "check_inventory_balance_single_location" CHECK (("storeId" IS NOT NULL AND "warehouseId" IS NULL) OR ("storeId" IS NULL AND "warehouseId" IS NOT NULL));

ALTER TABLE "inventory_balances" ADD CONSTRAINT "check_inventory_balance_quantity_non_negative" CHECK ("quantity" >= 0);

ALTER TABLE "inventory_balances" ADD CONSTRAINT "check_inventory_balance_reorder_level_non_negative" CHECK ("reorderLevel" >= 0);

ALTER TABLE "medicines" ADD CONSTRAINT "check_medicine_mrp_positive" CHECK ("mrp" > 0);

ALTER TABLE "inventory_movements" ADD CONSTRAINT "check_inventory_movement_quantity_after_non_negative" CHECK ("quantityAfter" >= 0);

ALTER TABLE "inventory_movements" ADD CONSTRAINT "check_inventory_movement_math" CHECK ("quantityAfter" = "quantityBefore" + "quantityChange");

