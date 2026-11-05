import { MedicineDTO } from './catalogue.js';

export type InventoryLocationType = 'STORE' | 'WAREHOUSE';

export type InventoryMovementType =
  | 'OPENING_STOCK'
  | 'STOCK_IMPORT'
  | 'MANUAL_ADJUSTMENT'
  | 'STOCK_CORRECTION';

export type InventoryImportStatus =
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED';

export type InventoryImportRowStatus = 'PENDING' | 'APPLIED' | 'REJECTED';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';

export interface WarehouseDTO {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLocationDTO {
  id: string;
  type: InventoryLocationType;
  code: string;
  name: string;
  city: string;
}

export interface InventoryBalanceDTO {
  id: string;
  medicineId: string;
  storeId?: string | null;
  warehouseId?: string | null;
  quantity: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  updatedAt: string;
  createdAt: string;
  medicine?: MedicineDTO;
  location?: InventoryLocationDTO;
}

export interface InventoryMovementDTO {
  id: string;
  medicineId: string;
  storeId?: string | null;
  warehouseId?: string | null;
  movementType: InventoryMovementType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason?: string | null;
  referenceId?: string | null;
  performedByUserId?: string | null;
  createdAt: string;
  medicineName?: string;
  medicineSku?: string;
  locationName?: string;
  actorEmail?: string;
}

export interface InventoryAdjustmentRequestDTO {
  medicineId: string;
  locationType: InventoryLocationType;
  locationId: string;
  quantityChange: number;
  reason: string;
}

export interface InventoryImportDTO {
  id: string;
  fileName: string;
  fileObjectKey?: string | null;
  locationType: InventoryLocationType;
  storeId?: string | null;
  warehouseId?: string | null;
  status: InventoryImportStatus;
  totalRows: number;
  appliedRows: number;
  rejectedRows: number;
  errorSummary?: unknown;
  importedByUserId: string;
  importedByEmail?: string;
  completedAt?: string | null;
  createdAt: string;
  locationName?: string;
}

export interface InventoryImportRowDTO {
  id: string;
  importId: string;
  rowNumber: number;
  sku: string;
  medicineId?: string | null;
  quantity?: number | null;
  status: InventoryImportRowStatus;
  errorMessage?: string | null;
  createdAt: string;
}

export interface InventorySummaryDTO {
  totalActiveMedicines: number;
  totalInventoryBalances: number;
  lowStockCount: number;
  outOfStockCount: number;
  unknownStockCount: number;
  totalStockUnits: number;
}
