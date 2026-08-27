import { getDb } from "../mongodb";
import type { AuditAction, AuditEntityType, AuditLogEntry, ID, Role } from "../types";

function uid(prefix: string): ID {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function auditLogs() {
  return getDb().then((db) => db.collection<AuditLogEntry>("audit_logs"));
}

export interface RecordAuditInput {
  orgOwnerId: ID;
  clientId: ID | null;
  actorId: ID;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: ID;
  entityLabel: string;
  details?: string;
}

/**
 * Appends one audit entry. Insert-only — nothing in this app ever updates
 * or deletes a row here, so a mutated or truncated workspace document can
 * never take the audit trail down with it. Failures are swallowed by the
 * caller (see app/api/audit/route.ts): a missed audit line should never
 * block the action it was trying to record.
 */
export async function recordAudit(input: RecordAuditInput): Promise<AuditLogEntry> {
  const col = await auditLogs();
  const entry: AuditLogEntry = {
    id: uid("aud"),
    at: new Date().toISOString(),
    ...input,
  };
  await col.insertOne(entry);
  return entry;
}

export interface ListAuditOptions {
  clientId?: ID | null;
  entityType?: AuditEntityType;
  action?: AuditAction;
  /** Cursor pagination: pass the `at` of the last row you saw. */
  before?: string;
  limit?: number;
}

export interface ListAuditResult {
  entries: AuditLogEntry[];
  hasMore: boolean;
}

export async function listAudit(
  orgOwnerId: ID,
  opts: ListAuditOptions = {},
): Promise<ListAuditResult> {
  const col = await auditLogs();
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);

  const filter: Record<string, unknown> = { orgOwnerId };
  if (opts.clientId) filter.clientId = opts.clientId;
  if (opts.entityType) filter.entityType = opts.entityType;
  if (opts.action) filter.action = opts.action;
  if (opts.before) filter.at = { $lt: opts.before };

  const rows = await col
    .find(filter, { projection: { _id: 0 } })
    .sort({ at: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = rows.length > limit;
  return { entries: rows.slice(0, limit), hasMore };
}
