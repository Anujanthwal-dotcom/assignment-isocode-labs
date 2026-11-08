export interface MailRecipient {
  email: string;
  name?: string;
}

export interface SendMailOptions {
  to: MailRecipient[];
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
  replyTo?: MailRecipient;
}

export interface SendMailResult {
  messageId: string;
  provider: string;
}

export interface IMailProvider {
  sendMail(options: SendMailOptions): Promise<SendMailResult>;
}
