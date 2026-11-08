export type UserRole = 'CUSTOMER' | 'PHARMACIST' | 'ADMIN' | 'STORE_STAFF';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type StoreStatus = 'ACTIVE' | 'INACTIVE';

export type OtpPurpose = 'LOGIN';

export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface CustomerProfileDto {
  id?: string;
  fullName: string;
  preferredLanguage: string;
}

export interface PharmacistProfileDto {
  id?: string;
  fullName: string;
  registrationNumber?: string | null;
}

export interface StoreSummaryDto {
  id: string;
  code: string;
  name: string;
  city?: string;
}

export interface CurrentUser {
  id: string;
  role: UserRole;
  status: UserStatus;
  profile: {
    fullName: string;
    preferredLanguage?: string;
    registrationNumber?: string | null;
    designation?: string | null;
  };
  store?: StoreSummaryDto;
}

export interface RequestOtpRequest {
  phone: string;
}

export interface RequestOtpResponse {
  success: boolean;
  message: string;
  developmentOtp?: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface StaffLoginRequest {
  email: string;
  password: string;
}

export interface AuthSuccessResponse {
  id: string;
  role: UserRole;
  status: UserStatus;
  profile: {
    fullName: string;
    preferredLanguage?: string;
    registrationNumber?: string | null;
    designation?: string | null;
  };
  store?: StoreSummaryDto;
}
