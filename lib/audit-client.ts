import type { AuditAction, AuditEntityType, ID } from "./types";

/**
 * Fire-and-forget audit write from the browser. Deliberately doesn't await
 * or surface errors to the caller — recording "who deleted what" should
 * never block or fail the delete itself. The server route is the source of
 * truth for *who* (it reads the actor off the session, not off this payload),
 * so this can't be spoofed into attributing an action to someone else.
 */
export function recordAudit(entry: {
  clientId?: ID | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: ID;
  entityLabel: string;
  details?: string;
}): void {
  try {
    fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch((err) => console.error("Audit write failed:", err));
  } catch (err) {
    console.error("Audit write failed:", err);
  }
}
