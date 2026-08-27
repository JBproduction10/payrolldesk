import { NextResponse } from "next/server";
import auth from "@/auth";
import { sendFeeReminderEmail } from "@/lib/email";

interface ReminderBody {
  to?: string;
  studentName?: string;
  className?: string;
  schoolName?: string;
  periodLabel?: string;
  currency?: string;
  amountDue?: number;
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (
    !session?.user ||
    !session.user.clientId ||
    (role !== "school_admin" && role !== "cashier" && role !== "finance")
  ) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: ReminderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { to, studentName, className, schoolName, periodLabel, currency, amountDue } = body;
  if (
    !to ||
    !studentName ||
    !className ||
    !schoolName ||
    !periodLabel ||
    !currency ||
    typeof amountDue !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid reminder fields." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "No valid guardian email on file for this student." }, { status: 400 });
  }

  try {
    const result = await sendFeeReminderEmail({
      orgOwnerId: session.user.orgOwnerId,
      to,
      studentName,
      className,
      schoolName,
      periodLabel,
      currency,
      amountDue,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to send fee reminder:", err);
    return NextResponse.json({ error: "Could not send the reminder." }, { status: 500 });
  }
}
