import { NextResponse } from "next/server";
import auth from "@/auth";
import { sendFeeReminderEmail } from "@/lib/email";
import { listUserIdsByRole } from "@/lib/db/users";
import { notifyUsers } from "@/lib/db/notifications";

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

    // Best-effort: let the school's other admins see the reminder went out
    // (or failed) without needing to check the student's record themselves.
    // Never blocks the response above.
    try {
      const schoolAdminIds = (
        await listUserIdsByRole(session.user.orgOwnerId, ["school_admin"], session.user.clientId)
      ).filter((id) => id !== session.user.id);
      await notifyUsers(schoolAdminIds, {
        orgOwnerId: session.user.orgOwnerId,
        clientId: session.user.clientId,
        type: result.sent ? "fee_reminder_sent" : "fee_reminder_failed",
        title: result.sent ? "Fee reminder sent" : "Fee reminder failed",
        message: result.sent
          ? `${session.user.name ?? "A team member"} sent a fee reminder to ${studentName}'s guardian.`
          : `${session.user.name ?? "A team member"} tried to send a fee reminder to ${studentName}'s guardian, but it failed.`,
        link: "/portal",
      });
    } catch (notifyErr) {
      console.error("Failed to notify school admins of fee reminder:", notifyErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to send fee reminder:", err);
    return NextResponse.json({ error: "Could not send the reminder." }, { status: 500 });
  }
}
