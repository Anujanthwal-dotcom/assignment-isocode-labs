import { z } from 'zod';

export const assignOrderReviewSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  reason: z.string().max(255).optional().nullable(),
});

export const updateOrderItemReviewSchema = z.object({
  medicineId: z.string().uuid('Invalid medicine ID').optional(),
  reviewedMedicineName: z.string().max(255).optional().nullable(),
  reviewedStrength: z.string().max(100).optional().nullable(),
  reviewedDosageForm: z.string().max(100).optional().nullable(),
  reviewedDosageInstructions: z.string().max(500).optional().nullable(),
  reviewedFrequency: z.string().max(100).optional().nullable(),
  reviewedDuration: z.string().max(100).optional().nullable(),
  reviewedQuantity: z.number().int().positive().optional().nullable(),
  decisionReason: z.string().max(500).optional().nullable(),
});

export const approveOrderItemSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required').max(100).optional(),
  prescriberName: z.string().min(1, 'Prescriber name is required').max(100).optional(),
  prescriberDetails: z.string().max(255).optional().nullable(),
});

export const rejectOrderItemSchema = z.object({
  reason: z.string().min(3, 'Rejection reason must be at least 3 characters').max(500),
});

export const blockOrderItemSchema = z.object({
  reason: z.string().min(3, 'Block reason must be at least 3 characters').max(500),
});

export const proposeAlternativeSchema = z.object({
  proposedMedicineId: z.string().uuid('Invalid proposed medicine ID'),
  reason: z.string().min(3, 'Reason for proposing alternative is required').max(500),
});

export const rejectPrescriptionSchema = z.object({
  reason: z.string().min(5, 'Prescription rejection reason must be at least 5 characters').max(500),
});

export const requestPrescriptionReuploadSchema = z.object({
  reason: z.string().min(5, 'Re-upload request reason must be at least 5 characters').max(500),
});

export const respondAlternativeProposalSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
  note: z.string().max(500).optional().nullable(),
});
