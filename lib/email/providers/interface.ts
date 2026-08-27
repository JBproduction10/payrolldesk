// lib/email/providers/interface.ts

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<EmailResult>;
  /** Cheap connectivity/credentials check, used by the "Send test email" button and by verifyConnection(). */
  verifyConnection(): Promise<boolean>;
}

export type EmailProviderKind = "resend" | "sendgrid" | "smtp";
export type EmailProviderType = EmailProviderKind;
