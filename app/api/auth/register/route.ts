import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as userDb from "@/lib/db/users";

const createUser = (userDb as unknown as {
  createUser: (input: {
    name: string;
    email: string;
    passwordHash: string;
  }) => Promise<{ _id: unknown; name: string; email: string }>;
}).createUser;

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
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash });
    return NextResponse.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create your account.";
    const status = message.includes("already exists") ? 409 : 500;
    if (status === 500) {
      console.error("Registration failed — is MONGODB_URI configured?", err);
    }
    return NextResponse.json(
      {
        error:
          status === 500
            ? "Couldn't reach the database. Please try again shortly."
            : message,
      },
      { status },
    );
  }
}
