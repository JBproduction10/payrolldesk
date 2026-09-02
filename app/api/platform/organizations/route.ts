import { NextResponse } from "next/server";
import { headers } from "next/headers";
import auth from "@/auth";
import { createOrganization, listOrganizations } from "@/lib/db/organizations";
import { createPromoterAdmin } from "@/lib/db/users";
import { sendInviteEmail } from "@/lib/email";

async function inviteBaseUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const organizations = await listOrganizations();
    return NextResponse.json({ organizations });
  } catch (err) {
    console.error("Failed to list organizations — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: {
    orgName?: string;
    promoterName?: string;
    promoterEmail?: string;
    hasTreasuryCompany?: boolean;
    treasuryCompanyName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orgName = body.orgName?.trim();
  const promoterName = body.promoterName?.trim();
  const promoterEmail = body.promoterEmail?.trim().toLowerCase();
  const hasTreasuryCompany = !!body.hasTreasuryCompany;

  if (!orgName || !promoterName || !promoterEmail) {
    return NextResponse.json(
      { error: "Organization name, promoter name and promoter email are all required." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(promoterEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (hasTreasuryCompany && !body.treasuryCompanyName?.trim()) {
    return NextResponse.json(
      { error: "Treasury company name is required when a treasury company is enabled." },
      { status: 400 },
    );
  }

  try {
    const { user, inviteToken } = await createPromoterAdmin({
      name: promoterName,
      email: promoterEmail,
    });
    const organization = await createOrganization({
      name: orgName,
      ownerId: user._id,
      hasTreasuryCompany,
      treasuryCompanyName: body.treasuryCompanyName,
    });

    const baseUrl = await inviteBaseUrl();
    const link = `${baseUrl}/accept-invite?token=${inviteToken}`;
    const emailResult = await sendInviteEmail({
      orgOwnerId: user._id,
      to: user.email,
      name: user.name,
      link,
      roleLabel: "Promoter / Super admin",
      orgName,
    });

    return NextResponse.json({ organization, invite: emailResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the organization.";
    const status = message.includes("already exists") ? 409 : 500;
    if (status === 500) {
      console.error("Failed to create organization:", err);
    }
    return NextResponse.json(
      { error: status === 500 ? "Couldn't reach the database." : message },
      { status },
    );
  }
}
