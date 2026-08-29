import { NextResponse } from "next/server";
import auth from "@/auth";
import { markNotificationRead } from "@/lib/db/notifications";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  try {
    // Scoped to session.user.id inside markNotificationRead — nobody can
    // mark another account's notification read this way.
    await markNotificationRead(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to mark notification read:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
