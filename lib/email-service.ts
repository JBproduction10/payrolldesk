// lib/email-service.ts
//
// Central place every outgoing email goes through. Looks up the sending
// org's EmailConfig (cached briefly to avoid a DB round-trip per email),
// builds whichever provider it's configured for, and falls back to the
// RESEND_API_KEY/EMAIL_FROM environment variables — the way this app sent
// email before this config system existed — for any org that hasn't set
// one up in Settings yet. Nothing about account creation, password resets,
// etc. depends on email actually succeeding; callers treat a failed send
// as "show the link/data in the UI instead", not as an error.

import { getEmailConfig, resolveSenderIdentity, type EmailConfigDoc } from "./db/email-config";
import { ResendProvider } from "./email/providers/resend.provider";
import { SendGridProvider } from "./email/providers/sendgrid.provider";
import { SMTPProvider } from "./email/providers/smtp.provider";
import type { EmailProvider, EmailOptions, EmailResult } from "./email/providers/interface";

export type NotificationType = keyof EmailConfigDoc["notifications"];

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  config: EmailConfigDoc | null;
  provider: EmailProvider;
  loadedAt: number;
}

class EmailService {
  private cache = new Map<string, CacheEntry>();

  private buildProvider(config: EmailConfigDoc | null): EmailProvider {
    const provider = config?.provider ?? (process.env.RESEND_API_KEY ? "resend" : "resend");

    switch (provider) {
      case "sendgrid":
        return new SendGridProvider(config?.sendgrid?.apiKey || process.env.SENDGRID_API_KEY || "");
      case "smtp":
        return new SMTPProvider({
          host: config?.smtp?.host || process.env.EMAIL_HOST || "",
          port: config?.smtp?.port || Number(process.env.EMAIL_PORT) || 587,
          secure: config?.smtp?.secure ?? process.env.EMAIL_SECURE === "true",
          user: config?.smtp?.user || process.env.EMAIL_USER || "",
          password: config?.smtp?.password || process.env.EMAIL_PASSWORD || "",
        });
      case "resend":
      default:
        return new ResendProvider(config?.resend?.apiKey || process.env.RESEND_API_KEY || "");
    }
  }

  private async loadEntry(orgOwnerId: string): Promise<CacheEntry> {
    const cached = this.cache.get(orgOwnerId);
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached;

    let config: EmailConfigDoc | null = null;
    try {
      config = await getEmailConfig(orgOwnerId);
    } catch (err) {
      // No MONGODB_URI, DB unreachable, etc. — fall through to env vars
      // rather than failing every email send in that window.
      console.error("Failed to load email config, falling back to env vars:", err);
    }

    const entry: CacheEntry = { config, provider: this.buildProvider(config), loadedAt: Date.now() };
    this.cache.set(orgOwnerId, entry);
    return entry;
  }

  private fromHeader(config: EmailConfigDoc | null, clientId?: string | null): string {
    const identity = resolveSenderIdentity(config, clientId);
    return `"${identity.fromName}" <${identity.fromEmail}>`;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Sends one email on behalf of `orgOwnerId`. If `notificationType` is
   * given and that org has switched it off in Settings, this is a silent
   * no-op that still reports success=true (the caller shouldn't treat
   * "the admin turned this off" as an error). `clientId`, when given,
   * picks that school's "from"/reply-to identity over the org default —
   * see resolveSenderIdentity in db/email-config.
   */
  async send(
    orgOwnerId: string,
    options: EmailOptions,
    notificationType?: NotificationType,
    clientId?: string | null,
  ): Promise<EmailResult> {
    const { config, provider } = await this.loadEntry(orgOwnerId);

    if (notificationType && config?.notifications[notificationType] === false) {
      return { success: true, messageId: "disabled" };
    }

    const identity = resolveSenderIdentity(config, clientId);
    const withDefaults: EmailOptions = {
      ...options,
      from: options.from ?? this.fromHeader(config, clientId),
      replyTo: options.replyTo ?? identity.replyTo,
      text: options.text ?? this.htmlToText(options.html),
    };

    return provider.send(withDefaults);
  }

  async verifyConnection(orgOwnerId: string): Promise<boolean> {
    const { provider } = await this.loadEntry(orgOwnerId);
    return provider.verifyConnection();
  }

  async testEmail(orgOwnerId: string, to: string, clientId?: string | null): Promise<EmailResult> {
    return this.send(
      orgOwnerId,
      {
        to,
        subject: "Test email — Payroll Desk",
        html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#24211d;">
          <h2>Test email</h2>
          <p>This is a test email from your Payroll Desk email settings.</p>
          <p>If you received this, your configuration is working correctly.</p>
          <p style="color:#9a9384;font-size:12px;">Sent at ${new Date().toLocaleString()}</p>
        </div>
      `,
      },
      undefined,
      clientId,
    );
  }

  /** Call after saving new settings so the next send picks them up immediately instead of waiting out the cache TTL. */
  clearCache(orgOwnerId: string): void {
    this.cache.delete(orgOwnerId);
  }
}

export const emailService = new EmailService();
