import { NextResponse } from "next/server";
import auth from "@/auth";
import { decideRequisitionScoped, markRequisitionPaidScoped } from "@/lib/db/workspace";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "treasury") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const { id } = await params;

  let body: {
    action?: "approve" | "reject" | "pay";
    note?: string;
    paidAmount?: number;
    paymentMethod?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const actor = { id: session.user.id, name: session.user.name ?? "Treasury", role: session.user.role };

  try {
    if (body.action === "approve" || body.action === "reject") {
      await decideRequisitionScoped(
        session.user.orgOwnerId,
        id,
        body.action === "approve" ? "approved" : "rejected",
        body.note?.trim() || undefined,
        actor,
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "pay") {
      if (!(Number(body.paidAmount) > 0) || !body.paymentMethod?.trim()) {
        return NextResponse.json(
          { error: "A paid amount and payment method are required." },
          { status: 400 },
        );
      }
      await markRequisitionPaidScoped(
        session.user.orgOwnerId,
        id,
        Number(body.paidAmount),
        body.paymentMethod.trim(),
        actor,
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("Failed to update requisition — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
