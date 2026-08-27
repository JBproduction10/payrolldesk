import { NextResponse } from "next/server";
import auth from "@/auth";
import { recordSupplySaleScoped } from "@/lib/db/workspace";
import type { SupplyCategory } from "@/lib/types";

const CATEGORIES: SupplyCategory[] = ["uniform", "shoes", "sweater", "other"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "intendance" || !session.user.clientId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: {
    category?: SupplyCategory;
    itemLabel?: string;
    quantity?: number;
    unitPrice?: number;
    buyerName?: string;
    soldAt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !body.category ||
    !CATEGORIES.includes(body.category) ||
    !body.itemLabel?.trim() ||
    !(Number(body.quantity) > 0) ||
    !(Number(body.unitPrice) >= 0) ||
    !body.buyerName?.trim() ||
    !body.soldAt
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const sale = await recordSupplySaleScoped(
      session.user.orgOwnerId,
      session.user.clientId,
      {
        category: body.category,
        itemLabel: body.itemLabel.trim(),
        quantity: Number(body.quantity),
        unitPrice: Number(body.unitPrice),
        buyerName: body.buyerName.trim(),
        soldAt: body.soldAt,
      },
      { id: session.user.id, name: session.user.name ?? "Intendance", role: session.user.role },
    );
    return NextResponse.json({ sale });
  } catch (err) {
    console.error("Failed to record sale — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
