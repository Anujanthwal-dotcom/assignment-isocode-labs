export enum RefillEligibilityStatus {
  ELIGIBLE = 'ELIGIBLE',
  CALCULATION_UNAVAILABLE = 'CALCULATION_UNAVAILABLE',
  AWAITING_VERIFIED_DOSAGE = 'AWAITING_VERIFIED_DOSAGE',
  DISCONTINUED = 'DISCONTINUED',
  INELIGIBLE = 'INELIGIBLE',
}

export enum RefillSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum RefillReminderStatus {
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  SKIPPED = 'SKIPPED',
}

export enum NotificationType {
  REFILL_REMINDER_DUE = 'REFILL_REMINDER_DUE',
  REFILL_REMINDER_SKIPPED = 'REFILL_REMINDER_SKIPPED',
  REFILL_SUBSCRIPTION_PAUSED = 'REFILL_SUBSCRIPTION_PAUSED',
  REFILL_SUBSCRIPTION_RESUMED = 'REFILL_SUBSCRIPTION_RESUMED',
  REFILL_SUBSCRIPTION_CANCELLED = 'REFILL_SUBSCRIPTION_CANCELLED',
  REFILL_ORDER_INITIATED = 'REFILL_ORDER_INITIATED',
}

export interface RefillEstimateDto {
  id: string;
  orderItemId: string;
  customerId: string;
  familyMemberId?: string | null;
  familyMemberName?: string | null;
  medicineId: string;
  medicineName: string;
  sku: string;
  dispensedQuantity: number;
  dailyConsumption?: number | null;
  estimatedSupplyDays?: number | null;
  dispensedAt: string;
  estimatedRunOutAt?: string | null;
  daysRemaining?: number | null;
  eligibilityStatus: RefillEligibilityStatus;
  ineligibilityReason?: string | null;
  calculationVersion: number;
  calculatedAt: string;
  activeSubscription?: RefillSubscriptionDto | null;
}

export interface RefillSubscriptionDto {
  id: string;
  customerId: string;
  familyMemberId?: string | null;
  familyMemberName?: string | null;
  medicineId: string;
  medicineName: string;
  refillEstimateId: string;
  status: RefillSubscriptionStatus;
  reminderDaysBefore: number;
  preferredNotificationChannel: string;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string | null;
  cancelledAt?: string | null;
  estimatedRunOutAt?: string | null;
  daysRemaining?: number | null;
}

export interface RefillReminderDto {
  id: string;
  subscriptionId: string;
  refillEstimateId: string;
  scheduledFor: string;
  sentAt?: string | null;
  status: RefillReminderStatus;
  notificationId?: string | null;
  createdAt: string;
}

export interface CustomerNotificationDto {
  id: string;
  customerId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AdminAnalyticsOverviewDto {
  totalOrders: number;
  pendingVerificationOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  fulfilmentOrders: number;
  handedOverOrders: number;
  stockUnavailableOrders: number;
  activeStoresCount: number;
  activeRefillSubscriptionsCount: number;
  totalRevenue?: number;
  deliveredRevenue?: number;
  averageOrderValue?: number;
  customersCount?: number;
  pharmacistsCount?: number;
  staffCount?: number;
  totalStoresCount?: number;
  dateRange: {
    from: string;
    to: string;
    period: string;
  };
}

export interface StoreOrderAnalyticsDto {
  storeId: string;
  storeName: string;
  storeCode: string;
  totalOrders: number;
  pendingVerification: number;
  approved: number;
  rejected: number;
  inFulfilment: number;
  handedOver: number;
  stockUnavailable: number;
}

export interface VerificationAnalyticsDto {
  totalPrescriptionsReviewed: number;
  medianVerificationMinutes: number;
  averageVerificationMinutes: number;
  approvedCount: number;
  rejectedCount: number;
  reuploadRequestedCount: number;
  pendingReviewCount: number;
  rejectionReasons: Array<{
    reason: string;
    count: number;
  }>;
  byStore: Array<{
    storeId: string;
    storeName: string;
    storeCode: string;
    reviewedCount: number;
    medianMinutes: number;
    rejectionRate: number;
  }>;
}

export interface FulfilmentAnalyticsDto {
  ordersRouted: number;
  stockReserved: number;
  handedOverCount: number;
  stockUnavailableCount: number;
  medianPickingMinutes: number;
  medianPackingMinutes: number;
  byStore: Array<{
    storeId: string;
    storeName: string;
    storeCode: string;
    routedCount: number;
    handedOverCount: number;
    stockUnavailableCount: number;
  }>;
}

export interface RefillAnalyticsDto {
  activeSubscriptions: number;
  estimatesGenerated: number;
  remindersScheduled: number;
  remindersSent: number;
  remindersSkipped: number;
  refillOrdersInitiated: number;
  refillOrdersHandedOver: number;
  conversionRatePercentage: number;
  timeline: Array<{
    date: string;
    remindersSent: number;
    refillOrders: number;
  }>;
}
