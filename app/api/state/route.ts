import { NextResponse } from "next/server";
import auth, { authOptions } from "@/auth";
import { getWorkspace, saveWorkspace } from "@/lib/db/workspace";
import { getEffectiveOrgOwnerId } from "@/lib/active-org";
import type { PayrollState } from "@/lib/types";
import { getServerSession } from "next-auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    const state = await getWorkspace(orgOwnerId);
    return NextResponse.json({ state });
  } catch (err) {
    console.error("Failed to load workspace — is MONGODB_URI configured?", err);
    return NextResponse.json(
      { error: "Couldn't reach the database." },
      { status: 503 },
    );
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  // Only the account that owns this workspace may overwrite it wholesale.
  // Scoped roles (school_admin, teacher, finance, promoter) mutate through
  // the narrower /api/portal/* routes instead.
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { state?: PayrollState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.state || !Array.isArray(body.state.clients)) {
    return NextResponse.json({ error: "Malformed workspace state." }, { status: 400 });
  }

  try {
    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    await saveWorkspace(orgOwnerId, body.state);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save workspace — is MONGODB_URI configured?", err);
    return NextResponse.json(
      { error: "Couldn't reach the database." },
      { status: 503 },
    );
  }
}
