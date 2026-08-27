import { NextResponse } from "next/server";
import { headers } from "next/headers";
import auth, { authOptions } from "@/auth";
import { createTeamMember, listTeamMembers } from "@/lib/db/users";
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

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const members = await listTeamMembers(session.user.orgOwnerId);
    return NextResponse.json({
      members: members.map((m) => ({
        id: m._id,
        name: m.name,
        email: m.email,
        role: m.role,
        clientId: m.clientId,
        employeeId: m.employeeId,
        status: m.passwordHash ? "active" : "pending",
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error("Failed to list team members — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: {
    name?: string;
    email?: string;
    role?: Role;
    clientId?: string | null;
    employeeId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, role } = body;
  if (!name?.trim() || !email?.trim() || !role) {
    return NextResponse.json(
      { error: "Name, email and role are all required." },
      { status: 400 },
    );
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  // ASSIGNABLE_ROLES excludes "super_admin", but TS can't infer that from
  // an .includes() check, so narrow explicitly for createTeamMember below.
  const assignedRole = role as Exclude<Role, "super_admin">;
  if (
    (role === "school_admin" ||
      role === "finance" ||
      role === "teacher" ||
      role === "cashier" ||
      role === "intendance") &&
    !body.clientId
  ) {
    return NextResponse.json(
      { error: "This role needs a school selected." },
      { status: 400 },
    );
  }
  if (role === "teacher" && !body.employeeId) {
    return NextResponse.json(
      { error: "Teacher accounts need an employee record selected." },
      { status: 400 },
    );
  }

  try {
    const { user: member, inviteToken } = await createTeamMember({
      name,
      email,
      role: assignedRole,
      orgOwnerId: session.user.orgOwnerId,
      clientId:
        assignedRole === "promoter" || assignedRole === "treasury"
          ? null
          : (body.clientId ?? null),
      employeeId: assignedRole === "teacher" ? (body.employeeId ?? null) : null,
    });

    const base = await inviteBaseUrl();
    const link = `${base}/accept-invite?token=${inviteToken}`;
    const result = await sendInviteEmail({
      orgOwnerId: session.user.orgOwnerId,
      to: member.email,
      name: member.name,
      link,
      roleLabel: ROLE_LABEL[assignedRole],
      orgName: session.user.name ?? "your organisation",
    });

    await appendTeamAuditLog(
      session.user.orgOwnerId,
      `Invited ${member.name} (${member.email}) as ${ROLE_LABEL[assignedRole]}`,
      { id: session.user.id, name: session.user.name ?? "Super admin", role: session.user.role },
    );

    return NextResponse.json({
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      inviteSent: result.sent,
      inviteLink: link,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the account.";
    const status = message.includes("already exists") ? 409 : 500;
    if (status === 500) {
      console.error("Failed to create team member — is MONGODB_URI configured?", err);
    }
    return NextResponse.json(
      { error: status === 500 ? "Couldn't reach the database." : message },
      { status },
    );
  }
}
