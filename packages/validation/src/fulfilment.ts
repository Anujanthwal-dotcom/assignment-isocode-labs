import { z } from 'zod';

export const manualRouteOrderSchema = z.object({
  storeId: z.string().uuid({ message: 'Valid store ID is required.' }),
  reason: z.string().min(5, { message: 'Manual routing reason must be at least 5 characters.' }),
});

export const pickItemConfirmSchema = z.object({
  quantityPicked: z.number().int().positive({ message: 'Quantity picked must be a positive integer.' }),
});

export const pickItemExceptionSchema = z.object({
  reason: z.string().min(5, { message: 'Exception reason must be at least 5 characters.' }),
});

export const completePackingSchema = z.object({
  checklistConfirmed: z.boolean().refine((val) => val === true, {
    message: 'Packing checklist must be confirmed.',
  }),
  notes: z.string().optional(),
});

export const recordHandoverSchema = z.object({
  handoverType: z.enum(['DELIVERY_PARTNER', 'CUSTOMER_PICKUP']),
  recipientName: z.string().min(2, { message: 'Recipient name is required.' }),
  recipientPhone: z.string().optional(),
  deliveryPartnerName: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const recordCodCollectionSchema = z.object({
  amount: z.number().positive({ message: 'Collected amount must be positive.' }),
  paymentReference: z.string().optional(),
});

export type ManualRouteOrderInput = z.infer<typeof manualRouteOrderSchema>;
export type PickItemConfirmInput = z.infer<typeof pickItemConfirmSchema>;
export type PickItemExceptionInput = z.infer<typeof pickItemExceptionSchema>;
export type CompletePackingInput = z.infer<typeof completePackingSchema>;
export type RecordHandoverInput = z.infer<typeof recordHandoverSchema>;
export type RecordCodCollectionInput = z.infer<typeof recordCodCollectionSchema>;
