// lib/db/email-config.ts
//
// Email transport (provider + credentials) is one shared org-wide setting —
// every school sends through the same SMTP relay / provider account. The
// "from" identity is different: each school can have its own from-name,
// from-email and reply-to, so a payslip or fee reminder from Les Cèdres
// doesn't look like it came from a different school. `defaultIdentity`
// is used for mail that has no clientId (org-wide roles like promoter,
// treasury, super_admin) and as the fallback for any school that hasn't set
// its own identity yet.

import { getDb } from "../mongodb";
import type { EmailProviderKind } from "../email/providers/interface";

export interface SenderIdentity {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

export interface EmailConfigDoc {
  _id: string; // orgOwnerId
  provider: EmailProviderKind;
  smtp?: { host: string; port: number; secure: boolean; user: string; password: string };
  sendgrid?: { apiKey: string };
  resend?: { apiKey: string };
  /** Used when no clientId applies, and as the fallback for a school without its own override. */
  defaultIdentity: SenderIdentity;
  /** Per-school "from" identity overrides, keyed by Client id. */
  clientIdentities: Record<string, SenderIdentity>;
  notifications: {
    invite: boolean;
    passwordReset: boolean;
    payslip: boolean;
    feeReminder: boolean;
    /** Covers both "a requisition needs Treasury's attention" and "yours was decided". */
    requisition: boolean;
  };
  updatedAt: string;
}

export type EmailNotificationType = keyof EmailConfigDoc["notifications"];

export const DEFAULT_NOTIFICATIONS: EmailConfigDoc["notifications"] = {
  invite: true,
  passwordReset: true,
  payslip: true,
  feeReminder: true,
  requisition: true,
};

export const DEFAULT_SENDER_IDENTITY: SenderIdentity = {
  fromName: "Payroll Desk",
  fromEmail: "",
};

function collection() {
  return getDb().then((db) => db.collection<EmailConfigDoc>("emailConfigs"));
}

/**
 * Normalizes a doc saved before the per-school split existed — those rows
 * have top-level `fromName`/`fromEmail`/`replyTo` and no `defaultIdentity`/
 * `clientIdentities` at all. Read-only shim: doesn't write anything back,
 * just makes older rows behave the same as new ones until they're next saved.
 */
function normalize(doc: EmailConfigDoc | null): EmailConfigDoc | null {
  if (!doc) return doc;
  if (doc.defaultIdentity && doc.clientIdentities) return doc;
  const legacy = doc as unknown as { fromName?: string; fromEmail?: string; replyTo?: string };
  return {
    ...doc,
    defaultIdentity: doc.defaultIdentity ?? {
      fromName: legacy.fromName ?? DEFAULT_SENDER_IDENTITY.fromName,
      fromEmail: legacy.fromEmail ?? DEFAULT_SENDER_IDENTITY.fromEmail,
      replyTo: legacy.replyTo || undefined,
    },
    clientIdentities: doc.clientIdentities ?? {},
  };
}

/** Returns the org's saved config, or null if it hasn't configured one yet (env-var fallback applies). */
export async function getEmailConfig(orgOwnerId: string): Promise<EmailConfigDoc | null> {
  const col = await collection();
  return normalize(await col.findOne({ _id: orgOwnerId }));
}

/**
 * The "from" identity to actually send with: that school's override if it
 * has one, else the org's default — merged field by field, so a school that
 * only set a from-email still inherits the default from-name/reply-to.
 */
export function resolveSenderIdentity(
  config: EmailConfigDoc | null,
  clientId?: string | null,
): SenderIdentity {
  const fallback: SenderIdentity = {
    fromName: config?.defaultIdentity?.fromName || process.env.EMAIL_FROM_NAME || "Payroll Desk",
    fromEmail: config?.defaultIdentity?.fromEmail || process.env.EMAIL_FROM || "onboarding@resend.dev",
    replyTo: config?.defaultIdentity?.replyTo,
  };
  const override = clientId ? config?.clientIdentities?.[clientId] : undefined;
  if (!override) return fallback;
  return {
    fromName: override.fromName || fallback.fromName,
    fromEmail: override.fromEmail || fallback.fromEmail,
    replyTo: override.replyTo || fallback.replyTo,
  };
}

/**
 * Creates or updates an org's transport config (provider, credentials,
 * default identity, notification toggles). `patch` only needs the fields
 * being changed — the provider-specific credential blocks (smtp/sendgrid/
 * resend) are merged shallowly so, e.g., saving a new default from-name
 * doesn't wipe out a previously-saved API key for a provider that isn't
 * currently selected. Per-school identities are untouched here — see
 * saveClientSenderIdentity below.
 */
export async function saveEmailConfig(
  orgOwnerId: string,
  patch: Partial<Omit<EmailConfigDoc, "_id" | "updatedAt" | "clientIdentities">>,
): Promise<EmailConfigDoc> {
  const col = await collection();
  const existing = normalize(await col.findOne({ _id: orgOwnerId }));

  const next: EmailConfigDoc = {
    _id: orgOwnerId,
    provider: patch.provider ?? existing?.provider ?? "resend",
    defaultIdentity: patch.defaultIdentity
      ? { ...existing?.defaultIdentity, ...patch.defaultIdentity }
      : (existing?.defaultIdentity ?? DEFAULT_SENDER_IDENTITY),
    smtp: patch.smtp ? { ...existing?.smtp, ...patch.smtp } : existing?.smtp,
    sendgrid: patch.sendgrid
      ? { ...existing?.sendgrid, ...patch.sendgrid }
      : existing?.sendgrid,
    resend: patch.resend ? { ...existing?.resend, ...patch.resend } : existing?.resend,
    clientIdentities: existing?.clientIdentities ?? {},
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

/**
 * Sets (or, passing `null`, clears) one school's "from" identity override.
 * Seeds the rest of the config with sane defaults if this org has never
 * saved anything yet, same as saveEmailConfig would.
 */
export async function saveClientSenderIdentity(
  orgOwnerId: string,
  clientId: string,
  identity: SenderIdentity | null,
): Promise<EmailConfigDoc> {
  const col = await collection();
  const existing = normalize(await col.findOne({ _id: orgOwnerId }));

  const clientIdentities = { ...existing?.clientIdentities };
  if (identity) {
    clientIdentities[clientId] = identity;
  } else {
    delete clientIdentities[clientId];
  }

  const next: EmailConfigDoc = {
    _id: orgOwnerId,
    provider: existing?.provider ?? "resend",
    defaultIdentity: existing?.defaultIdentity ?? DEFAULT_SENDER_IDENTITY,
    smtp: existing?.smtp,
    sendgrid: existing?.sendgrid,
    resend: existing?.resend,
    clientIdentities,
    notifications: { ...DEFAULT_NOTIFICATIONS, ...existing?.notifications },
    updatedAt: new Date().toISOString(),
  };

  await col.replaceOne({ _id: orgOwnerId }, next, { upsert: true });
  return next;
}

