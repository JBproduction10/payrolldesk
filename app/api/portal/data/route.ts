import { NextResponse } from "next/server";
import auth, { authOptions } from "@/auth";
import { getPortalData } from "@/lib/db/portal";
import { getServerSession } from "next-auth/next";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const data = await getPortalData({
      role: session.user.role,
      orgOwnerId: session.user.orgOwnerId,
      clientId: session.user.clientId,
      employeeId: session.user.employeeId,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to load portal data — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
