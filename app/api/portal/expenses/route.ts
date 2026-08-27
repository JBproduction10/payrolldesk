import { NextResponse } from "next/server";
import auth, { authOptions } from "@/auth";
import {
  addExpenseScoped,
  removeExpenseScoped,
  updateExpenseScoped,
} from "@/lib/db/workspace";
import type { Expense } from "@/lib/types";

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

  let body: Omit<Expense, "id" | "clientId" | "createdAt">;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body?.description?.trim() || !(body.amount > 0) || !body.date) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const expense = await addExpenseScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      { ...body, submittedBy: session.user.name ?? "Cashier" },
      { id: session.user.id, name: session.user.name ?? "Cashier", role: session.user.role },
    );
    return NextResponse.json({ expense });
  } catch (err) {
    console.error("Failed to add expense — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireCashier();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: { id?: string; patch?: Partial<Expense> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.id || !body.patch) {
    return NextResponse.json({ error: "Missing id or patch." }, { status: 400 });
  }

  try {
    await updateExpenseScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      body.id,
      body.patch,
      { id: session.user.id, name: session.user.name ?? "Cashier", role: session.user.role },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update expense — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireCashier();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  try {
    await removeExpenseScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      id,
      { id: session.user.id, name: session.user.name ?? "Cashier", role: session.user.role },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to remove expense — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
