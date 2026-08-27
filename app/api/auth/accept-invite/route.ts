import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { activateAccount, findUserByInviteToken } from "@/lib/db/users";

function tokenValid(user: { inviteExpires: string | null } | null) {
  return Boolean(
    user?.inviteExpires && new Date(user.inviteExpires).getTime() > Date.now(),
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
  }

  try {
    const user = await findUserByInviteToken(token);
    if (!user || !tokenValid(user)) {
      return NextResponse.json(
        { error: "This invite link is invalid or has expired." },
        { status: 404 },
      );
    }
    return NextResponse.json({ name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error("Invite lookup failed — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json(
      { error: "Missing token or password." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await activateAccount(token, passwordHash);
    if (!user) {
      return NextResponse.json(
        { error: "This invite link is invalid or has expired." },
        { status: 404 },
      );
    }
    return NextResponse.json({ email: user.email });
  } catch (err) {
    console.error("Account activation failed — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
