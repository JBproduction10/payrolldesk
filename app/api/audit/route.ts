import { NextResponse } from "next/server";
import auth from "@/auth";
import { listAudit, recordAudit } from "@/lib/db/audit";
import type { AuditAction, AuditEntityType } from "@/lib/types";

const ACTIONS: AuditAction[] = [
  "delete",
  "restore",
  "purge",
  "update",
  "generate",
  "clear",
  "deliver",
];
const ENTITY_TYPES: AuditEntityType[] = [
  "employee",
  "student",
  "client",
  "payslip",
  "expense",
];

/** Any signed-in member of the org can write an audit line for their own action. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    clientId?: string | null;
    action?: string;
    entityType?: string;
    entityId?: string;
    entityLabel?: string;
    details?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !body.action ||
    !ACTIONS.includes(body.action as AuditAction) ||
    !body.entityType ||
    !ENTITY_TYPES.includes(body.entityType as AuditEntityType) ||
    !body.entityId ||
    !body.entityLabel
  ) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  try {
    const entry = await recordAudit({
      orgOwnerId: session.user.orgOwnerId,
      clientId: body.clientId ?? session.user.clientId ?? null,
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Unknown",
      actorRole: session.user.role,
      action: body.action as AuditAction,
      entityType: body.entityType as AuditEntityType,
      entityId: body.entityId,
      entityLabel: body.entityLabel,
      details: body.details,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    // An audit write failing should never be why the underlying action fails —
    // the caller fires this off in the background and doesn't block on it.
    console.error("Failed to record audit entry:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

/** Only the org owner (super_admin) can read the audit trail. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") as AuditEntityType | null;
  const action = searchParams.get("action") as AuditAction | null;
  const before = searchParams.get("before");
  const limit = Number(searchParams.get("limit") ?? 25);

  try {
    const result = await listAudit(session.user.orgOwnerId, {
      entityType: entityType && ENTITY_TYPES.includes(entityType) ? entityType : undefined,
      action: action && ACTIONS.includes(action) ? action : undefined,
      before: before ?? undefined,
      limit,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to load audit trail:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
