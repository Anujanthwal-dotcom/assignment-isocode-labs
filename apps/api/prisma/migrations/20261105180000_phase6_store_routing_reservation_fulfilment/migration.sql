-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderRoutingMethod" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrderRoutingStatus" AS ENUM ('SUCCESS', 'NO_ELIGIBLE_STORE', 'FAILED');

-- CreateEnum
CREATE TYPE "PickingItemStatus" AS ENUM ('PENDING', 'PICKED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('DELIVERY_PARTNER', 'CUSTOMER_PICKUP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE 'STOCK_RESERVED';
ALTER TYPE "InventoryMovementType" ADD VALUE 'STOCK_RESERVATION_RELEASED';
ALTER TYPE "InventoryMovementType" ADD VALUE 'STOCK_DISPENSED';
ALTER TYPE "InventoryMovementType" ADD VALUE 'STOCK_ADJUSTMENT';
ALTER TYPE "InventoryMovementType" ADD VALUE 'STOCK_DISCREPANCY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'ROUTING_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE 'STOCK_UNAVAILABLE';
ALTER TYPE "OrderStatus" ADD VALUE 'STOCK_RESERVED';
ALTER TYPE "OrderStatus" ADD VALUE 'PICKING';
ALTER TYPE "OrderStatus" ADD VALUE 'PACKED';
ALTER TYPE "OrderStatus" ADD VALUE 'READY_FOR_HANDOVER';
ALTER TYPE "OrderStatus" ADD VALUE 'HANDED_OVER';
ALTER TYPE "OrderStatus" ADD VALUE 'FULFILMENT_CANCELLED';

-- AlterTable
ALTER TABLE "customer_addresses" ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "fulfilmentStoreId" UUID;

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "reservedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ(6),
    "consumedAt" TIMESTAMPTZ(6),
    "releaseReason" TEXT,
    "reservedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_routing_decisions" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID,
    "routingMethod" "OrderRoutingMethod" NOT NULL DEFAULT 'AUTOMATIC',
    "status" "OrderRoutingStatus" NOT NULL,
    "distanceKm" DECIMAL(10,2),
    "candidateStoreIds" JSONB,
    "failureReason" TEXT,
    "routedByUserId" UUID,
    "routedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_routing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_pickings" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "quantityRequired" INTEGER NOT NULL,
    "quantityPicked" INTEGER NOT NULL DEFAULT 0,
    "status" "PickingItemStatus" NOT NULL DEFAULT 'PENDING',
    "exceptionReason" TEXT,
    "pickedByUserId" UUID,
    "pickedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_item_pickings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "OrderPaymentMethod" NOT NULL,
    "paymentStatus" "OrderPaymentStatus" NOT NULL,
    "issuedByUserId" UUID,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "medicineName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "strength" TEXT,
    "dosageForm" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_handovers" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "handoverType" "HandoverType" NOT NULL,
    "handedOverByUserId" UUID NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "deliveryPartnerName" TEXT,
    "referenceNumber" TEXT,
    "handedOverAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_cod_collections" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "collectedAmount" DECIMAL(10,2) NOT NULL,
    "paymentReference" TEXT,
    "collectedByUserId" UUID NOT NULL,
    "collectedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_cod_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_reservations_storeId_medicineId_status_idx" ON "stock_reservations"("storeId", "medicineId", "status");

-- CreateIndex
CREATE INDEX "stock_reservations_orderId_status_idx" ON "stock_reservations"("orderId", "status");

-- CreateIndex
CREATE INDEX "stock_reservations_expiresAt_status_idx" ON "stock_reservations"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "order_routing_decisions_orderId_routedAt_idx" ON "order_routing_decisions"("orderId", "routedAt");

-- CreateIndex
CREATE INDEX "order_routing_decisions_storeId_status_idx" ON "order_routing_decisions"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_pickings_orderItemId_key" ON "order_item_pickings"("orderItemId");

-- CreateIndex
CREATE INDEX "order_item_pickings_orderId_status_idx" ON "order_item_pickings"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoices_storeId_issuedAt_idx" ON "invoices"("storeId", "issuedAt");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "order_handovers_orderId_key" ON "order_handovers"("orderId");

-- CreateIndex
CREATE INDEX "order_handovers_storeId_handedOverAt_idx" ON "order_handovers"("storeId", "handedOverAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_cod_collections_orderId_key" ON "order_cod_collections"("orderId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfilmentStoreId_fkey" FOREIGN KEY ("fulfilmentStoreId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_routing_decisions" ADD CONSTRAINT "order_routing_decisions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_routing_decisions" ADD CONSTRAINT "order_routing_decisions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_routing_decisions" ADD CONSTRAINT "order_routing_decisions_routedByUserId_fkey" FOREIGN KEY ("routedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_pickings" ADD CONSTRAINT "order_item_pickings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_pickings" ADD CONSTRAINT "order_item_pickings_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_pickings" ADD CONSTRAINT "order_item_pickings_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_pickings" ADD CONSTRAINT "order_item_pickings_pickedByUserId_fkey" FOREIGN KEY ("pickedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_handovers" ADD CONSTRAINT "order_handovers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_handovers" ADD CONSTRAINT "order_handovers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_handovers" ADD CONSTRAINT "order_handovers_handedOverByUserId_fkey" FOREIGN KEY ("handedOverByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cod_collections" ADD CONSTRAINT "order_cod_collections_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cod_collections" ADD CONSTRAINT "order_cod_collections_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

