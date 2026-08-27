import { NextResponse } from "next/server";
import auth from "@/auth";
import { recordSupplyInventoryCountScoped } from "@/lib/db/workspace";
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
    countedQty?: number;
    countedAt?: string;
    note?: string;
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
    body.countedQty === undefined ||
    !(Number(body.countedQty) >= 0) ||
    !body.countedAt
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const count = await recordSupplyInventoryCountScoped(
      session.user.orgOwnerId,
      session.user.clientId,
      {
        category: body.category,
        itemLabel: body.itemLabel.trim(),
        countedQty: Number(body.countedQty),
        countedAt: body.countedAt,
        note: body.note?.trim(),
      },
      { id: session.user.id, name: session.user.name ?? "Intendance", role: session.user.role },
    );
    return NextResponse.json({ count });
  } catch (err) {
    console.error("Failed to record inventory count — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
