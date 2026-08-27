import { NextResponse } from "next/server";
import auth, { authOptions } from "@/auth";
import {
  addStudentScoped,
  removeStudentScoped,
  updateStudentScoped,
} from "@/lib/db/workspace";
import type { Student } from "@/lib/types";

async function requireCashier() {
  const session = await auth();
  if (!session?.user || session.user.role !== "cashier" || !session.user.clientId) {
    return null;
  }
  return session;
}

export async function POST(req: Request) {
  const session = await requireCashier();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: Omit<Student, "id" | "clientId">;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body?.name?.trim() || !body?.className?.trim() || !(body.monthlyFee > 0)) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const actor = { id: session.user.id, name: session.user.name ?? "Cashier", role: session.user.role };

  try {
    const student = await addStudentScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      body,
      actor,
    );
    return NextResponse.json({ student });
  } catch (err) {
    console.error("Failed to add student — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireCashier();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: { id?: string; patch?: Partial<Student> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.id || !body.patch) {
    return NextResponse.json({ error: "Missing id or patch." }, { status: 400 });
  }

  const actor = { id: session.user.id, name: session.user.name ?? "Cashier", role: session.user.role };

  try {
    await updateStudentScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      body.id,
      body.patch,
      actor,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update student — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireCashier();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const actor = { id: session.user.id, name: session.user.name ?? "Cashier", role: session.user.role };

  try {
    await removeStudentScoped(session.user.orgOwnerId, session.user.clientId as string, id, actor);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to remove student — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
