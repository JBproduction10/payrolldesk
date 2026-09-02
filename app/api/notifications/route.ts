import { NextResponse } from "next/server";
import auth from "@/auth";
import { listNotifications } from "@/lib/db/notifications";
import { getEffectiveOrgOwnerId } from "@/lib/active-org";

/** Any signed-in account can read its own notifications — never anyone else's. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    const result = await listNotifications(orgOwnerId, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to load notifications — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
