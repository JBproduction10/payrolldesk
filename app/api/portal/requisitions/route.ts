import { NextResponse } from "next/server";
import auth from "@/auth";
import { submitRequisitionScoped } from "@/lib/db/workspace";
import type { RequisitionCategory } from "@/lib/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "school_admin" || !session.user.clientId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { category?: RequisitionCategory; description?: string; amountRequested?: number; period?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    (body.category !== "fund_request" && body.category !== "payroll") ||
    !body.description?.trim() ||
    !(Number(body.amountRequested) > 0)
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const requisition = await submitRequisitionScoped(
      session.user.orgOwnerId,
      session.user.clientId,
      {
        category: body.category,
        description: body.description.trim(),
        amountRequested: Number(body.amountRequested),
        period: body.period,
      },
      { id: session.user.id, name: session.user.name ?? "School admin", role: session.user.role },
    );
    return NextResponse.json({ requisition });
  } catch (err) {
    console.error("Failed to submit requisition — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
