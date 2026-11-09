export type StockReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED' | 'EXPIRED';

export type OrderRoutingMethod = 'AUTOMATIC' | 'MANUAL';

export type OrderRoutingStatus = 'SUCCESS' | 'NO_ELIGIBLE_STORE' | 'FAILED';

export type PickingItemStatus = 'PENDING' | 'PICKED' | 'EXCEPTION';

export type HandoverType = 'DELIVERY_PARTNER' | 'CUSTOMER_PICKUP';

export interface StockReservationDTO {
  id: string;
  orderId: string;
  orderItemId: string;
  storeId: string;
  medicineId: string;
  medicineName?: string;
  sku?: string;
  quantity: number;
  status: StockReservationStatus;
  expiresAt: string;
  reservedAt: string;
  releasedAt?: string | null;
  consumedAt?: string | null;
  releaseReason?: string | null;
  storeName?: string;
  storeCode?: string;
}

export interface OrderRoutingDecisionDTO {
  id: string;
  orderId: string;
  storeId?: string | null;
  storeName?: string | null;
  storeCode?: string | null;
  routingMethod: OrderRoutingMethod;
  status: OrderRoutingStatus;
  distanceKm?: number | null;
  candidateStoreIds?: string[] | null;
  failureReason?: string | null;
  routedByEmail?: string | null;
  routedAt: string;
}

export interface OrderItemPickingDTO {
  id: string;
  orderId: string;
  orderItemId: string;
  medicineId: string;
  medicineName: string;
  sku: string;
  strength?: string | null;
  dosageForm?: string | null;
  quantityRequired: number;
  quantityPicked: number;
  status: PickingItemStatus;
  exceptionReason?: string | null;
  pickedByEmail?: string | null;
  pickedAt?: string | null;
}

export interface InvoiceLineItemDTO {
  id: string;
  medicineId: string;
  medicineName: string;
  sku: string;
  strength?: string | null;
  dosageForm?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  issuedAt: string;
  items: InvoiceLineItemDTO[];
}

export interface OrderHandoverDTO {
  id: string;
  orderId: string;
  storeId: string;
  handoverType: HandoverType;
  handedOverByEmail: string;
  recipientName: string;
  recipientPhone?: string | null;
  deliveryPartnerName?: string | null;
  referenceNumber?: string | null;
  handedOverAt: string;
  notes?: string | null;
  codCollected?: {
    amount: number;
    reference?: string | null;
    collectedAt: string;
  } | null;
}

export interface SiblingStoreOrderSummary {
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  itemCount: number;
  status: string;
}

export interface StoreFulfilmentOrderSummaryDTO {
  orderId: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone?: string | null;
  placedAt: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  storeId: string;
  storeName?: string;
  storeCode?: string;
  reservationExpiresAt?: string | null;
  routingMethod?: OrderRoutingMethod | null;
  distanceKm?: number | null;
  stagingLocation?: string | null;
  stagingNotes?: string | null;
  isSplitOrder?: boolean;
  splitPartIndex?: number;
  totalSplitParts?: number;
  siblingStores?: SiblingStoreOrderSummary[];
}
