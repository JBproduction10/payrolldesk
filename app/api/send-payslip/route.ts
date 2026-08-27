import { NextResponse } from "next/server";
import auth, { authOptions } from "@/auth";
import { sendPayslipEmail, type PayslipEmailLine } from "@/lib/email";

interface SendPayslipBody {
  to?: string;
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
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to send payslip email:", err);
    return NextResponse.json({ error: "Could not send the email." }, { status: 500 });
  }
}
