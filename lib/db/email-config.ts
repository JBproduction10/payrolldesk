// lib/db/email-config.ts
//
// One email configuration per organization (keyed by orgOwnerId, same
// pattern as the workspace document) — each school-payroll org can pick
// its own provider and "from" identity rather than sharing one global
// setting, matching how everything else in this multi-tenant app is
// scoped by orgOwnerId.

import { getDb } from "../mongodb";
import type { EmailProviderKind } from "../email/providers/interface";

export interface EmailConfigDoc {
  _id: string; // orgOwnerId
  provider: EmailProviderKind;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  smtp?: { host: string; port: number; secure: boolean; user: string; password: string };
  sendgrid?: { apiKey: string };
  resend?: { apiKey: string };
  notifications: {
    invite: boolean;
    passwordReset: boolean;
    payslip: boolean;
    feeReminder: boolean;
  };
  updatedAt: string;
}

export type EmailNotificationType = keyof EmailConfigDoc["notifications"];

export const DEFAULT_NOTIFICATIONS: EmailConfigDoc["notifications"] = {
  invite: true,
  passwordReset: true,
  payslip: true,
  feeReminder: true,
};

function collection() {
  return getDb().then((db) => db.collection<EmailConfigDoc>("emailConfigs"));
}

/** Returns the org's saved config, or null if it hasn't configured one yet (env-var fallback applies). */
export async function getEmailConfig(orgOwnerId: string): Promise<EmailConfigDoc | null> {
  const col = await collection();
  return col.findOne({ _id: orgOwnerId });
}

/**
 * Creates or updates an org's config. `patch` only needs the fields being
 * changed — the provider-specific credential blocks (smtp/sendgrid/resend)
 * are merged shallowly so, e.g., saving a new "from name" doesn't wipe out
 * a previously-saved API key for a provider that isn't currently selected.
 */
export async function saveEmailConfig(
  orgOwnerId: string,
  patch: Partial<Omit<EmailConfigDoc, "_id" | "updatedAt">>,
): Promise<EmailConfigDoc> {
  const col = await collection();
  const existing = await col.findOne({ _id: orgOwnerId });

  const next: EmailConfigDoc = {
    _id: orgOwnerId,
    provider: patch.provider ?? existing?.provider ?? "resend",
    fromName: patch.fromName ?? existing?.fromName ?? "Payroll Desk",
    fromEmail: patch.fromEmail ?? existing?.fromEmail ?? "",
    replyTo: patch.replyTo ?? existing?.replyTo,
    smtp: patch.smtp ? { ...existing?.smtp, ...patch.smtp } : existing?.smtp,
    sendgrid: patch.sendgrid
      ? { ...existing?.sendgrid, ...patch.sendgrid }
      : existing?.sendgrid,
    resend: patch.resend ? { ...existing?.resend, ...patch.resend } : existing?.resend,
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...existing?.notifications,
      ...patch.notifications,
    },
    updatedAt: new Date().toISOString(),
  };

  await col.replaceOne({ _id: orgOwnerId }, next, { upsert: true });
  return next;
}
