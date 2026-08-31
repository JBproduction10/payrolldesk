import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { issuePasswordResetToken } from "@/lib/db/users";
import { sendPasswordResetEmail } from "@/lib/email";

async function resetBaseUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

// Always the same generic response, whether or not the email is registered —
// this endpoint is public, so it must never confirm which emails exist in
// the system, and it must never return the reset link/token in the response.
// Built fresh per-request (not a shared constant) since a Response body can
// only be read once.
function genericResponse() {
  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, we've sent password reset instructions.",
  });
}

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const result = await issuePasswordResetToken(email);
    if (result) {
      const base = await resetBaseUrl();
      const link = `${base}/reset-password?token=${result.token}`;
      // Fire-and-forget-ish, but still awaited so failures are logged —
      // the response to the caller is identical either way.
      await sendPasswordResetEmail({
        orgOwnerId: result.user.orgOwnerId,
        to: result.user.email,
        name: result.user.name,
        link,
        clientId: result.user.clientId,
      });
    }
    return genericResponse();
  } catch (err) {
    // A genuine outage (not "email not found") is fine to surface distinctly —
    // it isn't an enumeration risk, just an honest "try again" signal.
    console.error("Forgot-password request failed — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
