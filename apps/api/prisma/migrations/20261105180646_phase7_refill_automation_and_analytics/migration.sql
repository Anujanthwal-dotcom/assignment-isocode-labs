-- CreateEnum
CREATE TYPE "RefillEligibilityStatus" AS ENUM ('ELIGIBLE', 'CALCULATION_UNAVAILABLE', 'AWAITING_VERIFIED_DOSAGE', 'DISCONTINUED', 'INELIGIBLE');

-- CreateEnum
CREATE TYPE "RefillSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RefillReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REFILL_REMINDER_DUE', 'REFILL_REMINDER_SKIPPED', 'REFILL_SUBSCRIPTION_PAUSED', 'REFILL_SUBSCRIPTION_RESUMED', 'REFILL_SUBSCRIPTION_CANCELLED', 'REFILL_ORDER_INITIATED');

-- AlterTable
ALTER TABLE "order_item_reviews" ADD COLUMN     "administrationsPerDay" DECIMAL(10,2),
ADD COLUMN     "unitsPerAdministration" DECIMAL(10,2),
ADD COLUMN     "verifiedDosageConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedDosageUnit" TEXT;

-- CreateTable
CREATE TABLE "refill_estimates" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "familyMemberId" UUID,
    "medicineId" UUID NOT NULL,
    "dispensedQuantity" INTEGER NOT NULL,
    "dailyConsumption" DECIMAL(10,2),
    "estimatedSupplyDays" DECIMAL(10,2),
    "dispensedAt" TIMESTAMPTZ(6) NOT NULL,
    "estimatedRunOutAt" TIMESTAMPTZ(6),
    "eligibilityStatus" "RefillEligibilityStatus" NOT NULL,
    "ineligibilityReason" TEXT,
    "calculationInputs" JSONB NOT NULL,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refill_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refill_subscriptions" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "familyMemberId" UUID,
    "medicineId" UUID NOT NULL,
    "refillEstimateId" UUID NOT NULL,
    "status" "RefillSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 5,
    "preferredNotificationChannel" TEXT NOT NULL DEFAULT 'IN_APP',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "pausedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),

    CONSTRAINT "refill_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refill_reminders" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "refillEstimateId" UUID NOT NULL,
    "scheduledFor" TIMESTAMPTZ(6) NOT NULL,
    "sentAt" TIMESTAMPTZ(6),
    "status" "RefillReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notificationId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refill_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notifications" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refill_estimates_customerId_eligibilityStatus_idx" ON "refill_estimates"("customerId", "eligibilityStatus");

-- CreateIndex
CREATE INDEX "refill_estimates_medicineId_idx" ON "refill_estimates"("medicineId");

-- CreateIndex
CREATE INDEX "refill_estimates_orderItemId_idx" ON "refill_estimates"("orderItemId");

-- CreateIndex
CREATE INDEX "refill_subscriptions_customerId_status_idx" ON "refill_subscriptions"("customerId", "status");

-- CreateIndex
CREATE INDEX "refill_subscriptions_medicineId_idx" ON "refill_subscriptions"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "refill_reminders_idempotencyKey_key" ON "refill_reminders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refill_reminders_subscriptionId_status_idx" ON "refill_reminders"("subscriptionId", "status");

-- CreateIndex
CREATE INDEX "refill_reminders_scheduledFor_status_idx" ON "refill_reminders"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "customer_notifications_customerId_isRead_idx" ON "customer_notifications"("customerId", "isRead");

-- CreateIndex
CREATE INDEX "customer_notifications_customerId_createdAt_idx" ON "customer_notifications"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "refill_estimates" ADD CONSTRAINT "refill_estimates_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_estimates" ADD CONSTRAINT "refill_estimates_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_estimates" ADD CONSTRAINT "refill_estimates_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_estimates" ADD CONSTRAINT "refill_estimates_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_subscriptions" ADD CONSTRAINT "refill_subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_subscriptions" ADD CONSTRAINT "refill_subscriptions_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_subscriptions" ADD CONSTRAINT "refill_subscriptions_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_subscriptions" ADD CONSTRAINT "refill_subscriptions_refillEstimateId_fkey" FOREIGN KEY ("refillEstimateId") REFERENCES "refill_estimates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_reminders" ADD CONSTRAINT "refill_reminders_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "refill_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_reminders" ADD CONSTRAINT "refill_reminders_refillEstimateId_fkey" FOREIGN KEY ("refillEstimateId") REFERENCES "refill_estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_reminders" ADD CONSTRAINT "refill_reminders_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "customer_notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
