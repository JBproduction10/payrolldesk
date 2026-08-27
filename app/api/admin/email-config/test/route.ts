import { NextResponse } from "next/server";
import auth from "@/auth";
import { emailService } from "@/lib/email-service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const to = body.to?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const result = await emailService.testEmail(session.user.orgOwnerId, to);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
