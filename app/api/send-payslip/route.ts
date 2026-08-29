import { NextResponse } from "next/server";
import auth, { authOptions } from "@/auth";
import { sendPayslipEmail, type PayslipEmailLine } from "@/lib/email";
import { findUserByEmployeeId } from "@/lib/db/users";
import { notifyUsers } from "@/lib/db/notifications";

interface SendPayslipBody {
  to?: string;
  employeeId?: string;
  employeeName?: string;
  schoolName?: string;
  periodLabel?: string;
  currency?: string;
  earnings?: PayslipEmailLine[];
  deductions?: PayslipEmailLine[];
  gross?: number;
  totalDeductions?: number;
  net?: number;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: SendPayslipBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    to,
    employeeId,
    employeeName,
    schoolName,
    periodLabel,
    currency,
    earnings,
    deductions,
    gross,
    totalDeductions,
    net,
  } = body;

  if (
    !to ||
    !employeeName ||
    !schoolName ||
    !periodLabel ||
    !currency ||
    !Array.isArray(earnings) ||
    !Array.isArray(deductions) ||
    typeof gross !== "number" ||
    typeof totalDeductions !== "number" ||
    typeof net !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid payslip fields." }, { status: 400 });
  }

  try {
    const result = await sendPayslipEmail({
      orgOwnerId: session.user.orgOwnerId,
      to,
      employeeName,
      schoolName,
      periodLabel,
      currency,
      earnings,
      deductions,
      gross,
      totalDeductions,
      net,
    });

    // If this employee has their own "teacher" login, let them know
    // in-app too — best-effort, never blocks the email result above.
    if (employeeId) {
      try {
        const linkedUser = await findUserByEmployeeId(session.user.orgOwnerId, employeeId);
        if (linkedUser) {
          await notifyUsers([linkedUser._id], {
            orgOwnerId: session.user.orgOwnerId,
            clientId: linkedUser.clientId,
            type: result.sent ? "payslip_sent" : "payslip_failed",
            title: result.sent ? "Payslip sent" : "Payslip delivery failed",
            message: result.sent
              ? `Your ${periodLabel} payslip was emailed to ${to}.`
              : `We couldn't email your ${periodLabel} payslip to ${to} — contact your administrator.`,
            link: "/portal",
          });
        }
      } catch (notifyErr) {
        console.error("Failed to create payslip notification:", notifyErr);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to send payslip email:", err);
    return NextResponse.json({ error: "Could not send the email." }, { status: 500 });
  }
}
