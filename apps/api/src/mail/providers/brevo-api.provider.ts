import { Logger } from '@nestjs/common';
import { IMailProvider, SendMailOptions, SendMailResult } from '../mail-provider.interface';

export class BrevoApiProvider implements IMailProvider {
  private readonly logger = new Logger(BrevoApiProvider.name);
  private readonly endpoint = 'https://api.brevo.com/v3/smtp/email';

  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly fromName: string,
  ) {}

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const payload = {
      sender: {
        name: this.fromName,
        email: this.fromEmail,
      },
      to: options.to.map((r) => ({
        email: r.email,
        name: r.name || r.email.split('@')[0],
      })),
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
      tags: options.tags || ['transactional'],
      replyTo: options.replyTo
        ? { email: options.replyTo.email, name: options.replyTo.name }
        : undefined,
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Brevo API send failed [HTTP ${response.status}]: ${errorText}`);
      throw new Error(`Brevo API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as { messageId?: string };
    const messageId = data.messageId || `brevo-${Date.now()}`;
    this.logger.log(`Brevo email sent to ${options.to.map((t) => t.email).join(', ')} [${messageId}]`);

    return {
      messageId,
      provider: 'brevo_api',
    };
  }
}
