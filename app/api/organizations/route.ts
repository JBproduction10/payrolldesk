import { NextResponse } from "next/server";
import auth from "@/auth";
import { createOrganization, listOrganizations } from "@/lib/db/organizations";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
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
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { name?: string; hasTreasuryCompany?: boolean; treasuryCompanyName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const hasTreasuryCompany = !!body.hasTreasuryCompany;

  if (!name) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }
  if (hasTreasuryCompany && !body.treasuryCompanyName?.trim()) {
    return NextResponse.json(
      { error: "Treasury company name is required when a treasury company is enabled." },
      { status: 400 },
    );
  }

  try {
    const organization = await createOrganization({
      name,
      hasTreasuryCompany,
      treasuryCompanyName: body.treasuryCompanyName,
    });
    return NextResponse.json({ organization });
  } catch (err) {
    console.error("Failed to create organization:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
