import { ComplianceEvaluationResult } from './compliance.js';

export type PrescriptionReviewStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REUPLOAD_REQUESTED';

export type OrderItemReviewStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'ALTERNATIVE_PENDING_CUSTOMER'
  | 'REMOVED';

export type AlternativeProposalStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type H1RegisterStatus = 'PENDING_FULFILLMENT' | 'COMPLETED' | 'CANCELLED';

export interface OrderReviewAssignmentDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  assignedByUserId: string;
  assignedAt: string;
  unassignedAt?: string | null;
  reason?: string | null;
}

export interface AssignOrderReviewDTO {
  storeId: string;
  reason?: string;
}

export interface OrderItemReviewDTO {
  id: string;
  orderItemId: string;
  prescriptionReviewId: string;
  pharmacistId: string;
  medicineId: string;
  medicineSku: string;
  medicineName: string;
  medicineSchedule: string;
  status: OrderItemReviewStatus;
  reviewedMedicineName?: string | null;
  reviewedStrength?: string | null;
  reviewedDosageForm?: string | null;
  reviewedDosageInstructions?: string | null;
  reviewedFrequency?: string | null;
  reviewedDuration?: string | null;
  reviewedQuantity?: number | null;
  decisionReason?: string | null;
  complianceEvaluation?: ComplianceEvaluationResult | null;
  complianceRuleSetId?: string | null;
  reviewedAt?: string | null;
}

export interface OrderItemAlternativeProposalDTO {
  id: string;
  orderItemId: string;
  prescriptionReviewId: string;
  proposedByPharmacistId: string;
  originalMedicine: {
    id: string;
    sku: string;
    name: string;
    brandName?: string | null;
    genericName?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    mrp: number;
  };
  proposedMedicine: {
    id: string;
    sku: string;
    name: string;
    brandName?: string | null;
    genericName?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    packSize?: string | null;
    mrp: number;
  };
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  packSize?: string | null;
  priceDifference: number;
  reason: string;
  status: AlternativeProposalStatus;
  customerRespondedAt?: string | null;
  customerNote?: string | null;
  createdAt: string;
}

export interface H1RegisterEntryDTO {
  id: string;
  orderItemId: string;
  prescriptionId: string;
  storeId: string;
  storeName?: string;
  patientName: string;
  prescriberName: string;
  prescriberDetails?: string | null;
  medicineName: string;
  quantity: number;
  pharmacistId: string;
  pharmacistName?: string;
  status: H1RegisterStatus;
  createdAt: string;
}

export interface PrescriptionReviewDTO {
  id: string;
  prescriptionId: string;
  orderId: string;
  pharmacistId: string;
  storeId: string;
  status: PrescriptionReviewStatus;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacistQueueItemDTO {
  orderId: string;
  orderNumber: string;
  customerName: string;
  placedAt: string;
  orderStatus: string;
  prescriptionId: string;
  prescriptionStatus: string;
  reviewStatus: PrescriptionReviewStatus;
  itemCount: number;
  medicineNames: string[];
  assignedStoreId: string;
  assignedStoreName: string;
}

export interface PharmacistReviewDetailDTO {
  order: {
    id: string;
    orderNumber: string;
    placedAt: string;
    status: string;
    customerNote?: string | null;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    totalAmount: number;
    customerUser: {
      id: string;
      fullName: string;
      phone?: string | null;
      email?: string | null;
    };
    familyMember?: {
      id: string;
      fullName: string;
      relationship: string;
    } | null;
  };
  prescription: {
    id: string;
    originalFileName: string;
    mimeType: string;
    uploadedAt: string;
    status: string;
    viewUrl: string;
  };
  aiExtraction: any | null;
  items: Array<{
    orderItemId: string;
    medicineId: string;
    medicineName: string;
    brandName?: string | null;
    genericName?: string | null;
    sku: string;
    schedule: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    orderItemStatus: string;
    review?: OrderItemReviewDTO | null;
    activeAlternativeProposal?: OrderItemAlternativeProposalDTO | null;
    complianceEvaluation: ComplianceEvaluationResult;
    extractedDraft?: any | null;
    matchingResult?: any | null;
  }>;
  review: PrescriptionReviewDTO | null;
}
