import { NextResponse } from "next/server";
import auth from "@/auth";
import { hasPlatformAdminAuthority } from "@/lib/platform-auth";
import { getOrganizationById, setOrganizationStatus } from "@/lib/db/organizations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!hasPlatformAdminAuthority(session)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  let body: { status?: "active" | "suspended" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.status !== "active" && body.status !== "suspended") {
    return NextResponse.json({ error: "Status must be 'active' or 'suspended'." }, { status: 400 });
  }

  try {
    const existing = await getOrganizationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    const organization = await setOrganizationStatus(id, body.status);
    return NextResponse.json({ organization });
  } catch (err) {
    console.error("Failed to update organization status:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
