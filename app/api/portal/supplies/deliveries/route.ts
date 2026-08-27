import { NextResponse } from "next/server";
import auth from "@/auth";
import { recordSupplyDeliveryScoped } from "@/lib/db/workspace";
import type { SupplyCategory } from "@/lib/types";

const CATEGORIES: SupplyCategory[] = ["uniform", "shoes", "sweater", "other"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "treasury") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: {
    clientId?: string;
    category?: SupplyCategory;
    itemLabel?: string;
    quantity?: number;
    deliveredAt?: string;
    reference?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !body.clientId ||
    !body.category ||
    !CATEGORIES.includes(body.category) ||
    !body.itemLabel?.trim() ||
    !(Number(body.quantity) > 0) ||
    !body.deliveredAt ||
    !body.reference?.trim()
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const delivery = await recordSupplyDeliveryScoped(
      session.user.orgOwnerId,
      body.clientId,
      {
        category: body.category,
        itemLabel: body.itemLabel.trim(),
        quantity: Number(body.quantity),
        deliveredAt: body.deliveredAt,
        reference: body.reference.trim(),
      },
      { id: session.user.id, name: session.user.name ?? "Bonté Service", role: session.user.role },
    );
    return NextResponse.json({ delivery });
  } catch (err) {
    console.error("Failed to record delivery — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
