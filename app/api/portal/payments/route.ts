import { NextResponse } from "next/server";
import auth, { authOptions } from "@/auth";
import { recordPaymentScoped } from "@/lib/db/workspace";
import type { FeeStatus } from "@/lib/types";
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "cashier" || !session.user.clientId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: {
    studentId?: string;
    period?: string;
    amountPaid?: number;
    status?: FeeStatus;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { studentId, period, status } = body;
  const amountPaid = Math.max(0, Number(body.amountPaid) || 0);
  if (!studentId || !period || !status) {
    return NextResponse.json(
      { error: "studentId, period and status are all required." },
      { status: 400 },
    );
  }

  try {
    await recordPaymentScoped(
      session.user.orgOwnerId,
      session.user.clientId,
      studentId,
      period,
      amountPaid,
      status,
      { id: session.user.id, name: session.user.name ?? "Cashier", role: session.user.role },
      body.note,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to record payment — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
