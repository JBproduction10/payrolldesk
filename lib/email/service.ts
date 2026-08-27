import { getEmailConfig, DEFAULT_NOTIFICATIONS } from "../db/email-config";
import type { EmailConfigDoc, EmailNotificationType } from "../db/email-config";
import { ResendProvider } from "./providers/resend.provider";
import { SendGridProvider } from "./providers/sendgrid.provider";
import { SMTPProvider } from "./providers/smtp.provider";
import type { EmailOptions, EmailProvider, EmailResult } from "./providers/interface";

interface CacheEntry {
  config: EmailConfigDoc | null;
  provider: EmailProvider;
  loadedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Per-org email sending. This app is multi-tenant (one workspace per org),
 * so — unlike a single-tenant setup — config is cached per orgOwnerId
 * rather than as one global singleton, and provider credentials are always
 * passed straight into the provider's constructor instead of going through
 * process.env, so one org's request can never pick up another org's key.
 */
class EmailService {
  private cache = new Map<string, CacheEntry>();

  private buildProvider(config: EmailConfigDoc | null): EmailProvider {
    const provider = config?.provider ?? (process.env.RESEND_API_KEY ? "resend" : "resend");

    switch (provider) {
      case "smtp":
        return new SMTPProvider({
          host: config?.smtp?.host ?? process.env.EMAIL_HOST ?? "",
          port: config?.smtp?.port ?? Number(process.env.EMAIL_PORT ?? 587),
          secure: config?.smtp?.secure ?? process.env.EMAIL_SECURE === "true",
          user: config?.smtp?.user ?? process.env.EMAIL_USER ?? "",
          password: config?.smtp?.password ?? process.env.EMAIL_PASSWORD ?? "",
        });
      case "sendgrid":
        return new SendGridProvider(
          config?.sendgrid?.apiKey ?? process.env.SENDGRID_API_KEY ?? "",
        );
      case "resend":
      default:
        return new ResendProvider(
          config?.resend?.apiKey ?? process.env.RESEND_API_KEY ?? "",
        );
    }
  }

  private async loadEntry(orgOwnerId: string): Promise<CacheEntry> {
    const cached = this.cache.get(orgOwnerId);
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached;

    let config: EmailConfigDoc | null = null;
    try {
      config = await getEmailConfig(orgOwnerId);
    } catch (err) {
      console.error("Failed to load email config, falling back to env vars:", err);
    }

    const entry: CacheEntry = { config, provider: this.buildProvider(config), loadedAt: Date.now() };
    this.cache.set(orgOwnerId, entry);
    return entry;
  }

  private fromAddress(config: EmailConfigDoc | null): string {
    const name = config?.fromName ?? process.env.EMAIL_FROM_NAME ?? "Payroll Desk";
    const email = config?.fromEmail ?? process.env.EMAIL_FROM ?? "onboarding@resend.dev";
    return `"${name}" <${email}>`;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async send(
    orgOwnerId: string,
    options: EmailOptions,
    notificationType?: EmailNotificationType,
  ): Promise<EmailResult> {
    const { config, provider } = await this.loadEntry(orgOwnerId);

    if (notificationType) {
      const notifications = config?.notifications ?? DEFAULT_NOTIFICATIONS;
      if (notifications[notificationType] === false) {
        return { success: true, messageId: "disabled" };
      }
    }

    const send: EmailOptions = {
      ...options,
      from: options.from ?? this.fromAddress(config),
      replyTo: options.replyTo ?? config?.replyTo,
      text: options.text ?? this.htmlToText(options.html),
    };

    return provider.send(send);
  }

  async verifyConnection(orgOwnerId: string): Promise<boolean> {
    const { provider } = await this.loadEntry(orgOwnerId);
    return provider.verifyConnection();
  }

  async testEmail(orgOwnerId: string, to: string): Promise<EmailResult> {
    return this.send(orgOwnerId, {
      to,
      subject: "Test email — Payroll Desk",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #24211d;">
          <h2>Test email</h2>
          <p>This is a test email from your Payroll Desk email configuration.</p>
          <p>If you received this, your email setup is working correctly.</p>
          <p style="color:#9a9384;font-size:12px;">Sent at ${new Date().toLocaleString()}</p>
        </div>
      `,
    });
  }

  /** Call after saving new config for an org so the next send picks it up immediately. */
  clearCache(orgOwnerId: string): void {
    this.cache.delete(orgOwnerId);
  }
}

export const emailService = new EmailService();
