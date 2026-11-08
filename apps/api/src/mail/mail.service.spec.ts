import { MailService } from './mail.service';
import { MockMailProvider } from './providers/mock-mail.provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MailService Unit Tests', () => {
  let mailService: MailService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'nodeEnv') return 'test';
        if (key === 'mail.provider') return 'brevo';
        if (key === 'mail.apiKey') return 'test-brevo-api-key';
        if (key === 'mail.fromEmail') return 'no-reply@kolkatapharmacy.com';
        if (key === 'mail.fromName') return 'Kolkata Pharmacy';
        return defaultValue ?? null;
      }),
    };

    mailService = new MailService(mockConfigService);
  });

  it('initializes with MockMailProvider in test environment', () => {
    const provider = mailService.getProvider();
    expect(provider).toBeInstanceOf(MockMailProvider);
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
