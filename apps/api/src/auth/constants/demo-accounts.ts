export const DEMO_EMAILS = [
  'customer@example.com',
  'customer2@example.com',
  'pharmacist@example.com',
  'admin@example.com',
  'compliance@example.com',
  'staff.saltlake@example.com',
  'staff.howrah@example.com',
  'staff.southkolkata@example.com',
] as const;

export const DEMO_PHONES = ['9876543210', '9876543211'] as const;

export const DEMO_PASSWORD = 'DemoPassword123!';
export const DEMO_OTP = '123456';

export function isDemoEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  return (DEMO_EMAILS as readonly string[]).includes(clean);
}

export function isDemoPhone(phone: string): boolean {
  const clean = phone.trim();
  return (DEMO_PHONES as readonly string[]).includes(clean);
}

export function isDemoIdentifier(identifier: string): boolean {
  if (!identifier) return false;
  return identifier.includes('@') ? isDemoEmail(identifier) : isDemoPhone(identifier);
}
