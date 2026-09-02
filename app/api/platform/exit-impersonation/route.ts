import { NextResponse } from "next/server";
import auth from "@/auth";
import { findUserById } from "@/lib/db/users";
import { signImpersonationToken } from "@/lib/impersonation-token";

export async function POST() {
  const session = await auth();
  if (!session?.user?.impersonatorId) {
    return NextResponse.json({ error: "Not currently viewing as a promoter." }, { status: 400 });
  }

  try {
    const platformAdmin = await findUserById(session.user.impersonatorId);
    if (!platformAdmin || platformAdmin.role !== "platform_admin") {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const token = signImpersonationToken({ targetUserId: platformAdmin._id });
    return NextResponse.json({ token, email: platformAdmin.email });
  } catch (err) {
    console.error("Failed to exit impersonation:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
