import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { IMailProvider, SendMailOptions, SendMailResult } from '../mail-provider.interface';

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  fromEmail: string;
  fromName: string;
}

export class SmtpProvider implements IMailProvider {
  private readonly logger = new Logger(SmtpProvider.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(config: SmtpConfig) {
    this.fromAddress = `"${config.fromName}" <${config.fromEmail}>`;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: config.auth?.user && config.auth?.pass ? config.auth : undefined,
      tls: {
        rejectUnauthorized: false, // For local self-signed certs / dev sinks
      },
    });
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to.map((t) => (t.name ? `"${t.name}" <${t.email}>` : t.email)).join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo
          ? `"${options.replyTo.name || ''}" <${options.replyTo.email}>`
          : undefined,
      });

      this.logger.log(`Brevo SMTP email dispatched via Nodemailer to ${options.to.map((t) => t.email).join(', ')} [${info.messageId}]`);
      return {
        messageId: info.messageId || `smtp-${Date.now()}`,
        provider: 'brevo_smtp',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMTP email send failed: ${msg}`);
      throw err;
    }
  }
}
