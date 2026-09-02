import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createBootstrapAdmin, hasAnyPlatformAdmin } from "@/lib/db/users";

export async function GET() {
  try {
    const taken = await hasAnyPlatformAdmin();
    return NextResponse.json({ available: !taken });
  } catch (err) {
    console.error("Setup availability check failed — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are all required." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    // Locked the moment a platform_admin exists — this route only ever
    // creates that one account. Every promoter workspace after this is
    // added from the platform admin's Promoters page, not here.
    if (await hasAnyPlatformAdmin()) {
      return NextResponse.json(
        { error: "Setup has already been completed." },
        { status: 409 },
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createBootstrapAdmin({ name, email, passwordHash });
    return NextResponse.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create your account.";
    const status = message.includes("already exists") ? 409 : 500;
    if (status === 500) {
      console.error("Bootstrap setup failed — is MONGODB_URI configured?", err);
    }
    return NextResponse.json(
      { error: status === 500 ? "Couldn't reach the database." : message },
      { status },
    );
  }
}
