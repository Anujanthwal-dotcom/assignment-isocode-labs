import { Logger } from '@nestjs/common';
import { IMailProvider, SendMailOptions, SendMailResult } from '../mail-provider.interface';

export class MockMailProvider implements IMailProvider {
  private readonly logger = new Logger(MockMailProvider.name);
  public sentEmails: SendMailOptions[] = [];

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    this.sentEmails.push(options);
    const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.logger.debug(
      `[MockMailProvider] Subject: "${options.subject}" to ${options.to.map((t) => t.email).join(', ')}`,
    );
    return {
      messageId,
      provider: 'mock',
    };
  }

  clear(): void {
    this.sentEmails = [];
  }
}
