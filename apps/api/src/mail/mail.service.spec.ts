import { MailService } from './mail.service';
import { MockMailProvider } from './providers/mock-mail.provider';
import { SmtpProvider } from './providers/smtp.provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MailService Unit Tests', () => {
  let mailService: MailService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'mail.provider') return 'mock';
        if (key === 'mail.smtpUser') return '';
        if (key === 'mail.smtpKey') return '';
        if (key === 'mail.fromEmail') return 'no-reply@kolkatapharmacy.com';
        if (key === 'mail.fromName') return 'Kolkata Pharmacy';
        return defaultValue ?? null;
      }),
    };

    mailService = new MailService(mockConfigService);
  });

  it('initializes with MockMailProvider when MAIL_PROVIDER=mock', () => {
    const provider = mailService.getProvider();
    expect(provider).toBeInstanceOf(MockMailProvider);
  });

  it('initializes with SmtpProvider when Brevo SMTP credentials are provided', () => {
    const brevoConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'mail.provider') return 'brevo';
        if (key === 'mail.host') return 'smtp-relay.brevo.com';
        if (key === 'mail.smtpPort') return 587;
        if (key === 'mail.smtpUser') return 'user@example.com';
        if (key === 'mail.smtpKey') return 'xsmtpsib-secret-key';
        if (key === 'mail.fromEmail') return 'no-reply@kolkatapharmacy.com';
        if (key === 'mail.fromName') return 'Kolkata Pharmacy';
        return defaultValue ?? null;
      }),
    };

    const brevoMailService = new MailService(brevoConfigService as any);
    expect(brevoMailService.getProvider()).toBeInstanceOf(SmtpProvider);
  });

  it('falls back to MockMailProvider when Brevo credentials are not configured', () => {
    const unconfiguredService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'mail.provider') return 'brevo';
        return defaultValue ?? null;
      }),
    };

    const fallbackMailService = new MailService(unconfiguredService as any);
    expect(fallbackMailService.getProvider()).toBeInstanceOf(MockMailProvider);
  });

  it('sends login OTP email with branded template', async () => {
    const res = await mailService.sendLoginOtpEmail('customer@example.com', '123456');
    expect(res.provider).toBe('mock');
    expect(res.messageId).toContain('mock-');

    const mockProvider = mailService.getProvider() as MockMailProvider;
    expect(mockProvider.sentEmails).toHaveLength(1);
    expect(mockProvider.sentEmails[0].to[0].email).toBe('customer@example.com');
    expect(mockProvider.sentEmails[0].subject).toContain('123456');
    expect(mockProvider.sentEmails[0].html).toContain('123456');
    expect(mockProvider.sentEmails[0].html).toContain('Kolkata Pharmacy');
  });

  it('sends welcome email upon customer registration', async () => {
    const res = await mailService.sendWelcomeEmail('newuser@example.com', 'Siddhartha Roy');
    expect(res.provider).toBe('mock');

    const mockProvider = mailService.getProvider() as MockMailProvider;
    expect(mockProvider.sentEmails).toHaveLength(1);
    expect(mockProvider.sentEmails[0].to[0].email).toBe('newuser@example.com');
    expect(mockProvider.sentEmails[0].subject).toBe('Welcome to Kolkata Pharmacy');
    expect(mockProvider.sentEmails[0].html).toContain('Siddhartha Roy');
  });
});
