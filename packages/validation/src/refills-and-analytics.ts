import { z } from 'zod';

export const createRefillSubscriptionSchema = z.object({
  refillEstimateId: z.string().uuid('Invalid refill estimate ID'),
  reminderDaysBefore: z
    .number()
    .int()
    .refine((val) => [3, 5, 7].includes(val), {
      message: 'Reminder lead time must be 3, 5, or 7 days.',
    })
    .default(5),
  preferredNotificationChannel: z.enum(['IN_APP']).default('IN_APP'),
});

export const updateRefillSubscriptionSchema = z.object({
  reminderDaysBefore: z
    .number()
    .int()
    .refine((val) => [3, 5, 7].includes(val), {
      message: 'Reminder lead time must be 3, 5, or 7 days.',
    })
    .optional(),
  preferredNotificationChannel: z.enum(['IN_APP']).optional(),
});

export const pharmacistDosageVerificationSchema = z.object({
  unitsPerAdministration: z.number().positive('Units per administration must be positive'),
  administrationsPerDay: z.number().positive('Administrations per day must be positive'),
  verifiedDosageUnit: z.string().min(1, 'Dosage unit is required').max(50),
});

export const analyticsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  storeId: z.string().uuid().optional(),
  period: z.enum(['TODAY', '7D', '30D', '90D', 'CUSTOM']).optional().default('30D'),
});
