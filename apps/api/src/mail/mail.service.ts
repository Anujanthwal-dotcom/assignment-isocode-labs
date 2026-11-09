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
    const mailProviderConfig = this.configService.get<string>('mail.provider');
    const fromEmail = this.configService.get<string>('mail.fromEmail', 'no-reply@kolkatapharmacy.com');
    const fromName = this.configService.get<string>('mail.fromName', 'Kolkata Pharmacy');
    const host = this.configService.get<string>('mail.host', 'smtp-relay.brevo.com');
    const port = this.configService.get<number>('mail.smtpPort', 587);
    const smtpUser = this.configService.get<string>('mail.smtpUser');
    const smtpKey = this.configService.get<string>('mail.smtpKey');

    if (mailProviderConfig === 'mock') {
      this.provider = new MockMailProvider();
      this.logger.log('MailService initialized with MockMailProvider');
    } else if (smtpUser && smtpKey && !smtpKey.startsWith('xkeysib-your')) {
      this.provider = new SmtpProvider({
        host,
        port,
        auth: { user: smtpUser, pass: smtpKey },
        fromEmail,
        fromName,
      });
      this.logger.log(`MailService initialized with Brevo Nodemailer SmtpProvider (${host}:${port})`);
    } else {
      this.logger.warn(
        'Brevo SMTP credentials (BREVO_SMTP_USER & BREVO_SMTP_KEY) not fully configured; defaulting to MockMailProvider for local/offline development.',
      );
      this.provider = new MockMailProvider();
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
