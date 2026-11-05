-- CreateEnum
CREATE TYPE "PrescriptionAIStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'NEEDS_REUPLOAD', 'FAILED');

-- CreateTable
CREATE TABLE "prescription_ai_extractions" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "status" "PrescriptionAIStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "documentReadable" BOOLEAN NOT NULL DEFAULT true,
    "overallConfidence" DECIMAL(5,4),
    "extractionResult" JSONB,
    "matchingResult" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prescription_ai_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescription_ai_extractions_prescriptionId_createdAt_idx" ON "prescription_ai_extractions"("prescriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "prescription_ai_extractions_status_idx" ON "prescription_ai_extractions"("status");

-- AddForeignKey
ALTER TABLE "prescription_ai_extractions" ADD CONSTRAINT "prescription_ai_extractions_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
