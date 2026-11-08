import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailProvider, SendMailOptions, SendMailResult } from './mail-provider.interface';
import { BrevoApiProvider } from './providers/brevo-api.provider';
import { SmtpProvider } from './providers/smtp.provider';
import { MockMailProvider } from './providers/mock-mail.provider';
import { getLoginOtpEmailHtml, getWelcomeEmailHtml } from './mail-templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: IMailProvider;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('nodeEnv') || process.env.NODE_ENV;
    const mailProviderConfig = this.configService.get<string>('mail.provider');
    const brevoApiKey = this.configService.get<string>('mail.apiKey') || '';
    const fromEmail = this.configService.get<string>('mail.fromEmail', 'no-reply@kolkatapharmacy.com');
    const fromName = this.configService.get<string>('mail.fromName', 'Kolkata Pharmacy');

    if (nodeEnv === 'test') {
      this.provider = new MockMailProvider();
      this.logger.log('MailService initialized with MockMailProvider (test environment)');
    } else if (mailProviderConfig === 'brevo' && brevoApiKey && !brevoApiKey.startsWith('xkeysib-your')) {
      this.provider = new BrevoApiProvider(brevoApiKey, fromEmail, fromName);
      this.logger.log('MailService initialized with BrevoApiProvider (live REST API)');
    } else {
      const host = this.configService.get<string>('mail.host', 'localhost');
      const port = this.configService.get<number>('mail.smtpPort', 1025);
      const smtpUser = this.configService.get<string>('mail.smtpUser');
      const smtpKey = this.configService.get<string>('mail.smtpKey');

      this.provider = new SmtpProvider({
        host,
        port,
        auth: smtpUser && smtpKey ? { user: smtpUser, pass: smtpKey } : undefined,
        fromEmail,
        fromName,
      });
      this.logger.log(`MailService initialized with SmtpProvider (${host}:${port})`);
    }
  }

  getProvider(): IMailProvider {
    return this.provider;
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    return this.provider.sendMail(options);
  }

  async sendLoginOtpEmail(email: string, code: string): Promise<SendMailResult> {
    const html = getLoginOtpEmailHtml(code);
    return this.sendMail({
      to: [{ email }],
      subject: `Your Kolkata Pharmacy Login Code: ${code}`,
      html,
      text: `Your Kolkata Pharmacy login code is ${code}. It is valid for 5 minutes.`,
      tags: ['login-otp', 'auth'],
    });
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<SendMailResult> {
    const html = getWelcomeEmailHtml(fullName);
    return this.sendMail({
      to: [{ email, name: fullName }],
      subject: 'Welcome to Kolkata Pharmacy',
      html,
      text: `Welcome to Kolkata Pharmacy, ${fullName}! Your account is now active.`,
      tags: ['welcome', 'customer-onboarding'],
    });
  }
}
