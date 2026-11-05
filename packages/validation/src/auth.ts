/**
 * Normalizes an Indian mobile phone number:
 * Removes spaces, dashes, leading +91 or 0, returning canonical 10 digits.
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

/**
 * Validates whether string is a valid 10-digit Indian mobile number (starts with 6-9).
 */
export const isValidIndianMobile = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(normalized);
};

/**
 * Normalizes email address to lowercase and trimmed.
 */
export const normalizeEmail = (email: string): string => {
  return email ? email.trim().toLowerCase() : '';
};

/**
 * Validates 6-digit numeric OTP.
 */
export const isValidOtp = (otp: string): boolean => {
  return /^\d{6}$/.test(otp?.trim() || '');
};
