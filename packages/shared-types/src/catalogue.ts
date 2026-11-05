export type MedicineStatus = 'ACTIVE' | 'INACTIVE';

export type MedicineSchedule =
  | 'OTC'
  | 'SCHEDULE_H'
  | 'SCHEDULE_H1'
  | 'SCHEDULE_X'
  | 'NARCOTIC'
  | 'UNKNOWN';

export interface MedicineDTO {
  id: string;
  sku: string;
  name: string;
  brandName?: string | null;
  genericName?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  packSize?: string | null;
  schedule: MedicineSchedule;
  mrp: number;
  status: MedicineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicineDTO {
  sku: string;
  name: string;
  brandName?: string;
  genericName?: string;
  manufacturer?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: string;
  schedule?: MedicineSchedule;
  mrp: number;
}

export interface UpdateMedicineDTO {
  name?: string;
  brandName?: string;
  genericName?: string;
  manufacturer?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: string;
  schedule?: MedicineSchedule;
  mrp?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
