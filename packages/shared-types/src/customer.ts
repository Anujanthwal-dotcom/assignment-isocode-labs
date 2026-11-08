export type FamilyMemberRelationship =
  'SELF' | 'MOTHER' | 'FATHER' | 'SPOUSE' | 'CHILD' | 'SIBLING' | 'OTHER';

export interface FamilyMemberDTO {
  id: string;
  customerUserId: string;
  fullName: string;
  relationship: FamilyMemberRelationship;
  dateOfBirth?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFamilyMemberDTO {
  fullName: string;
  relationship: FamilyMemberRelationship;
  dateOfBirth?: string;
}

export interface UpdateFamilyMemberDTO {
  fullName?: string;
  relationship?: FamilyMemberRelationship;
  dateOfBirth?: string;
}

export interface CustomerAddressDTO {
  id: string;
  customerUserId: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerAddressDTO {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UpdateCustomerAddressDTO {
  label?: string;
  recipientName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export type PrescriptionStatus =
  'UPLOADED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUIRED';

export interface PrescriptionDTO {
  id: string;
  customerUserId: string;
  familyMemberId?: string | null;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: FamilyMemberRelationship;
  } | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: PrescriptionStatus;
  uploadedAt: string;
  updatedAt: string;
  quoteStatus?: 'QUOTED' | 'ACCEPTED' | 'EXPIRED' | null;
  orderId?: string | null;
  totalAmount?: number | null;
}

export interface PrescriptionFileAccessDTO {
  prescriptionId: string;
  fileName: string;
  mimeType: string;
  viewUrl: string;
  expiresInSeconds: number;
}

export interface CustomerMedicineDTO {
  id: string;
  sku: string;
  name: string;
  brandName?: string | null;
  genericName?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  packSize?: string | null;
  schedule: string;
  mrp: number;
}

export interface CustomerMedicineQueryDTO {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'mrp';
  sortOrder?: 'asc' | 'desc';
}

export interface CartItemDTO {
  id: string;
  medicine: {
    id: string;
    name: string;
    sku: string;
    brandName?: string | null;
    genericName?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    packSize?: string | null;
    schedule: string;
    status: string;
  };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartDTO {
  items: CartItemDTO[];
  subtotal: number;
  itemCount: number;
  hasInactiveItems?: boolean;
}

export interface AddToCartDTO {
  medicineId: string;
  quantity: number;
}

export interface UpdateCartItemQuantityDTO {
  quantity: number;
}

export type OrderStatus =
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'AWAITING_CUSTOMER_ACTION'
  | 'VERIFICATION_FAILED'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'ROUTING_PENDING'
  | 'STOCK_UNAVAILABLE'
  | 'STOCK_RESERVED'
  | 'PICKING'
  | 'PACKED'
  | 'READY_FOR_HANDOVER'
  | 'HANDED_OVER'
  | 'FULFILMENT_CANCELLED'
  | 'PROCESSING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderPaymentMethod = 'UPI' | 'COD';

export type OrderPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'NOT_REQUIRED';

export type OrderItemStatus = 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'REMOVED';

export interface OrderItemDTO {
  id: string;
  medicineId: string;
  medicineNameSnapshot: string;
  skuSnapshot: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  status: OrderItemStatus;
}

export interface OrderPaymentDTO {
  id: string;
  method: OrderPaymentMethod;
  status: OrderPaymentStatus;
  transactionReference?: string | null;
  amount: number;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistoryDTO {
  id: string;
  previousStatus?: OrderStatus | null;
  newStatus: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerUserId: string;
  familyMemberId?: string | null;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: FamilyMemberRelationship;
  } | null;
  prescriptionId: string;
  prescription?: {
    id: string;
    originalFileName: string;
    status: PrescriptionStatus;
    uploadedAt: string;
  };
  addressId?: string | null;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  addressSnapshot: {
    label: string;
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    postalCode: string;
  };
  customerNote?: string | null;
  placedAt: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDTO[];
  payment?: OrderPaymentDTO | null;
  statusHistory?: OrderStatusHistoryDTO[];
}

export interface CreateOrderDTO {
  familyMemberId?: string | null;
  prescriptionId: string;
  addressId: string;
  paymentMethod: OrderPaymentMethod;
  customerNote?: string;
}

export interface MockPaymentRequestDTO {
  result: 'SUCCESS' | 'FAILURE';
}

export interface MockPaymentResponseDTO {
  orderId: string;
  orderNumber: string;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderStatus;
  transactionReference?: string | null;
  message: string;
}

// ==========================================
// AI-Assisted Prescription Reading
// ==========================================

export type PrescriptionAIStatus =
  'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'NEEDS_REUPLOAD' | 'FAILED';

export interface ExtractedPrescriptionItemDTO {
  rawMedicineName: string;
  normalizedMedicineName: string | null;
  strength: string | null;
  dosageForm: string | null;
  dosageInstructions: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: number | null;
  confidence: number;
  sourceText: string | null;
  warnings: string[];
}

export interface PrescriptionExtractionResultDTO {
  documentReadable: boolean;
  overallConfidence: number;
  patientName: string | null;
  prescriberName: string | null;
  prescriptionDate: string | null;
  items: ExtractedPrescriptionItemDTO[];
  unreadableSections: string[];
  generalWarnings: string[];
}

export interface MedicineMatchCandidateDTO {
  medicineId: string;
  confidence: number;
  matchReasons: string[];
}

export interface GenericAlternativeDTO {
  medicineId: string;
  sku: string;
  name: string;
  brandName: string | null;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  mrp: string;
}

export interface MedicineMatchResultDTO {
  extractedItemIndex: number;
  candidates: MedicineMatchCandidateDTO[];
  selectedMedicineId: string | null;
  matchStatus: 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND';
  genericAlternatives?: GenericAlternativeDTO[];
  comparisonNotes?: string;
  matchedMedicine?: {
    id: string;
    sku: string;
    name: string;
    brandName?: string | null;
    genericName?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    mrp: string;
  };
}

export interface PrescriptionAIExtractionDTO {
  id: string;
  prescriptionId: string;
  status: PrescriptionAIStatus;
  provider: string;
  model: string;
  attemptNumber: number;
  documentReadable: boolean;
  overallConfidence: number | null;
  extractionResult: PrescriptionExtractionResultDTO | null;
  matchingResult: MedicineMatchResultDTO[] | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestPrescriptionExtractionResponseDTO {
  extractionId: string;
  prescriptionId: string;
  status: PrescriptionAIStatus;
  attemptNumber: number;
  createdAt: string;
}
