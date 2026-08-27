import { NextResponse } from "next/server";
import { headers } from "next/headers";
import auth, { authOptions } from "@/auth";
import {
  deleteUser,
  findUserById,
  regenerateInvite,
  updateTeamMember,
} from "@/lib/db/users";
import { appendTeamAuditLog } from "@/lib/db/workspace";
import { sendInviteEmail } from "@/lib/email";
import type { Role } from "@/lib/types";

const ASSIGNABLE_ROLES: Role[] = ["promoter", "school_admin", "teacher", "finance", "treasury", "cashier", "intendance"];

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  promoter: "Promoter",
  school_admin: "School admin",
  teacher: "Teacher",
  finance: "Finance staff",
  treasury: "Treasury (Bonté Service)",
  cashier: "Cashier",
  intendance: "Intendance & Logistics",
};

async function inviteBaseUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

/** Resend (or re-issue) an invite for a pending team member. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const target = await findUserById(id);
    if (!target || target.orgOwnerId !== session.user.orgOwnerId) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (target.passwordHash) {
      return NextResponse.json(
        { error: "This account has already set a password." },
        { status: 400 },
      );
    }

    const inviteToken = await regenerateInvite(id);
    if (!inviteToken) {
      return NextResponse.json({ error: "Could not re-issue the invite." }, { status: 500 });
    }

    const base = await inviteBaseUrl();
    const link = `${base}/accept-invite?token=${inviteToken}`;
    const result = await sendInviteEmail({
      orgOwnerId: session.user.orgOwnerId,
      to: target.email,
      name: target.name,
      link,
      roleLabel: ROLE_LABEL[target.role],
      orgName: session.user.name ?? "your organisation",
    });

    return NextResponse.json({ inviteSent: result.sent, inviteLink: link });
  } catch (err) {
    console.error("Failed to resend invite — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

/** Update a team member's name, role, or scope. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  let body: {
    name?: string;
    role?: Role;
    clientId?: string | null;
    employeeId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.role !== undefined && !ASSIGNABLE_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const role = body.role as Exclude<Role, "super_admin"> | undefined;

  if (
    role &&
    (role === "school_admin" ||
      role === "finance" ||
      role === "teacher" ||
      role === "cashier" ||
      role === "intendance") &&
    !body.clientId
  ) {
    return NextResponse.json({ error: "This role needs a school selected." }, { status: 400 });
  }
  if (role === "teacher" && !body.employeeId) {
    return NextResponse.json(
      { error: "Teacher accounts need an employee record selected." },
      { status: 400 },
    );
  }

  try {
    const target = await findUserById(id);
    if (!target || target.orgOwnerId !== session.user.orgOwnerId) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (target.role === "super_admin") {
      return NextResponse.json(
        { error: "Can't edit a super admin account this way." },
        { status: 400 },
      );
    }

    const updated = await updateTeamMember(id, session.user.orgOwnerId, {
      name: body.name,
      role,
      clientId: body.clientId,
      employeeId: body.employeeId,
    });
    if (!updated) {
      return NextResponse.json({ error: "Could not update that account." }, { status: 500 });
    }

    await appendTeamAuditLog(
      session.user.orgOwnerId,
      `Updated team member ${updated.name}${role ? ` — role set to ${ROLE_LABEL[role]}` : ""}`,
      { id: session.user.id, name: session.user.name ?? "Super admin", role: session.user.role },
    );

    return NextResponse.json({
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      clientId: updated.clientId,
      employeeId: updated.employeeId,
      status: updated.passwordHash ? "active" : "pending",
    });
  } catch (err) {
    console.error("Failed to update team member — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const target = await findUserById(id);
    if (!target || target.orgOwnerId !== session.user.orgOwnerId) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (target.role === "super_admin") {
      return NextResponse.json(
        { error: "Can't remove a super admin account this way." },
        { status: 400 },
      );
    }
    await deleteUser(id);
    await appendTeamAuditLog(
      session.user.orgOwnerId,
      `Removed team member ${target.name} (${target.email})`,
      { id: session.user.id, name: session.user.name ?? "Super admin", role: session.user.role },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to remove team member — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
