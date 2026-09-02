import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import auth from "@/auth";
import { getOrganizationById, getOrganizationByOrgOwnerId } from "@/lib/db/organizations";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const store = await cookies();
  const activeOrgId = store.get(ACTIVE_ORG_COOKIE)?.value;

  try {
    const active = activeOrgId
      ? await getOrganizationById(activeOrgId)
      : await getOrganizationByOrgOwnerId(session.user.orgOwnerId);
    return NextResponse.json({ organization: active });
  } catch (err) {
    console.error("Failed to resolve active organization:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  try {
    const organization = await getOrganizationById(body.organizationId);
    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    if (organization.status === "suspended") {
      return NextResponse.json(
        { error: "This organization is suspended — reactivate it first." },
        { status: 409 },
      );
    }

    const res = NextResponse.json({ organization });
    res.cookies.set(ACTIVE_ORG_COOKIE, organization.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (err) {
    console.error("Failed to switch active organization:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
