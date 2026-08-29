import { NextResponse } from "next/server";
import auth from "@/auth";
import { markAllNotificationsRead } from "@/lib/db/notifications";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    await markAllNotificationsRead(session.user.orgOwnerId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to mark all notifications read:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
