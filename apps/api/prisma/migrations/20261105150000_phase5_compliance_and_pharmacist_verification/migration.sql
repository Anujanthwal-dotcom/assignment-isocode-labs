-- AlterEnum OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_CUSTOMER_ACTION';
ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_APPROVED';
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED';

-- CreateEnum
CREATE TYPE "ComplianceRuleSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CompliancePolicyAction" AS ENUM ('ALLOW_WITH_REVIEW', 'REQUIRE_PRESCRIPTION_AND_APPROVAL', 'REQUIRE_H1_REGISTER', 'HARD_BLOCK', 'FAIL_CLOSED');

-- CreateEnum
CREATE TYPE "PrescriptionReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUESTED');

-- CreateEnum
CREATE TYPE "OrderItemReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED', 'ALTERNATIVE_PENDING_CUSTOMER', 'REMOVED');

-- CreateEnum
CREATE TYPE "AlternativeProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "H1RegisterStatus" AS ENUM ('PENDING_FULFILLMENT', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "order_review_assignments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMPTZ(6),
    "reason" TEXT,

    CONSTRAINT "order_review_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rule_sets" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ComplianceRuleSetStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMPTZ(6),
    "createdByUserId" UUID NOT NULL,
    "activatedByUserId" UUID,
    "activationReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "compliance_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rules" (
    "id" UUID NOT NULL,
    "ruleSetId" UUID NOT NULL,
    "medicineSchedule" "MedicineSchedule" NOT NULL,
    "policyAction" "CompliancePolicyAction" NOT NULL,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "requiresPharmacistApproval" BOOLEAN NOT NULL DEFAULT true,
    "requiresH1Register" BOOLEAN NOT NULL DEFAULT false,
    "hardBlocked" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_reviews" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "pharmacistId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "status" "PrescriptionReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMPTZ(6),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prescription_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_reviews" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "prescriptionReviewId" UUID NOT NULL,
    "pharmacistId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "status" "OrderItemReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedMedicineName" TEXT,
    "reviewedStrength" TEXT,
    "reviewedDosageForm" TEXT,
    "reviewedDosageInstructions" TEXT,
    "reviewedFrequency" TEXT,
    "reviewedDuration" TEXT,
    "reviewedQuantity" INTEGER,
    "decisionReason" TEXT,
    "complianceEvaluation" JSONB,
    "complianceRuleSetId" TEXT,
    "reviewedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_item_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_alternative_proposals" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "orderItemReviewId" UUID,
    "prescriptionReviewId" UUID NOT NULL,
    "proposedByPharmacistId" UUID NOT NULL,
    "originalMedicineId" UUID NOT NULL,
    "proposedMedicineId" UUID NOT NULL,
    "activeIngredient" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "packSize" TEXT,
    "priceDifference" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AlternativeProposalStatus" NOT NULL DEFAULT 'PENDING',
    "customerRespondedAt" TIMESTAMPTZ(6),
    "customerNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_item_alternative_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "h1_register_entries" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "orderItemReviewId" UUID,
    "prescriptionId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "patientName" TEXT NOT NULL,
    "prescriberName" TEXT NOT NULL,
    "prescriberDetails" TEXT,
    "medicineName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pharmacistId" UUID NOT NULL,
    "status" "H1RegisterStatus" NOT NULL DEFAULT 'PENDING_FULFILLMENT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "h1_register_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_review_assignments_orderId_unassignedAt_idx" ON "order_review_assignments"("orderId", "unassignedAt");
CREATE INDEX "order_review_assignments_storeId_unassignedAt_idx" ON "order_review_assignments"("storeId", "unassignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_rule_sets_version_key" ON "compliance_rule_sets"("version");
CREATE INDEX "compliance_rule_sets_status_effectiveFrom_idx" ON "compliance_rule_sets"("status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_rules_ruleSetId_medicineSchedule_key" ON "compliance_rules"("ruleSetId", "medicineSchedule");
CREATE INDEX "compliance_rules_ruleSetId_idx" ON "compliance_rules"("ruleSetId");

-- CreateIndex
CREATE INDEX "prescription_reviews_orderId_idx" ON "prescription_reviews"("orderId");
CREATE INDEX "prescription_reviews_storeId_status_idx" ON "prescription_reviews"("storeId", "status");
CREATE INDEX "prescription_reviews_pharmacistId_idx" ON "prescription_reviews"("pharmacistId");

-- CreateIndex
CREATE INDEX "order_item_reviews_orderItemId_idx" ON "order_item_reviews"("orderItemId");
CREATE INDEX "order_item_reviews_prescriptionReviewId_idx" ON "order_item_reviews"("prescriptionReviewId");

-- CreateIndex
CREATE INDEX "order_item_alternative_proposals_orderItemId_status_idx" ON "order_item_alternative_proposals"("orderItemId", "status");
CREATE INDEX "order_item_alternative_proposals_prescriptionReviewId_idx" ON "order_item_alternative_proposals"("prescriptionReviewId");

-- CreateIndex
CREATE INDEX "h1_register_entries_storeId_createdAt_idx" ON "h1_register_entries"("storeId", "createdAt");
CREATE INDEX "h1_register_entries_orderItemId_idx" ON "h1_register_entries"("orderItemId");

-- AddForeignKey
ALTER TABLE "order_review_assignments" ADD CONSTRAINT "order_review_assignments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_review_assignments" ADD CONSTRAINT "order_review_assignments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_review_assignments" ADD CONSTRAINT "order_review_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_rule_sets" ADD CONSTRAINT "compliance_rule_sets_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_rule_sets" ADD CONSTRAINT "compliance_rule_sets_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "compliance_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_reviews" ADD CONSTRAINT "prescription_reviews_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescription_reviews" ADD CONSTRAINT "prescription_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescription_reviews" ADD CONSTRAINT "prescription_reviews_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescription_reviews" ADD CONSTRAINT "prescription_reviews_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_reviews" ADD CONSTRAINT "order_item_reviews_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item_reviews" ADD CONSTRAINT "order_item_reviews_prescriptionReviewId_fkey" FOREIGN KEY ("prescriptionReviewId") REFERENCES "prescription_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item_reviews" ADD CONSTRAINT "order_item_reviews_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item_reviews" ADD CONSTRAINT "order_item_reviews_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_alternative_proposals" ADD CONSTRAINT "order_item_alternative_proposals_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item_alternative_proposals" ADD CONSTRAINT "order_item_alternative_proposals_orderItemReviewId_fkey" FOREIGN KEY ("orderItemReviewId") REFERENCES "order_item_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_item_alternative_proposals" ADD CONSTRAINT "order_item_alternative_proposals_prescriptionReviewId_fkey" FOREIGN KEY ("prescriptionReviewId") REFERENCES "prescription_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item_alternative_proposals" ADD CONSTRAINT "order_item_alternative_proposals_proposedByPharmacistId_fkey" FOREIGN KEY ("proposedByPharmacistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item_alternative_proposals" ADD CONSTRAINT "order_item_alternative_proposals_originalMedicineId_fkey" FOREIGN KEY ("originalMedicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item_alternative_proposals" ADD CONSTRAINT "order_item_alternative_proposals_proposedMedicineId_fkey" FOREIGN KEY ("proposedMedicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "h1_register_entries" ADD CONSTRAINT "h1_register_entries_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "h1_register_entries" ADD CONSTRAINT "h1_register_entries_orderItemReviewId_fkey" FOREIGN KEY ("orderItemReviewId") REFERENCES "order_item_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "h1_register_entries" ADD CONSTRAINT "h1_register_entries_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "h1_register_entries" ADD CONSTRAINT "h1_register_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "h1_register_entries" ADD CONSTRAINT "h1_register_entries_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
