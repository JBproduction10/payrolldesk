import { NextResponse } from "next/server";
import { headers } from "next/headers";
import auth from "@/auth";
import {
  CATEGORY_LABEL,
  decideRequisitionScoped,
  generatePayslipsForPaidPayrollScoped,
  getWorkspace,
  markRequisitionPaidScoped,
} from "@/lib/db/workspace";
import { findUserById, listUserIdsByRole } from "@/lib/db/users";
import { notifyUsers } from "@/lib/db/notifications";
import { sendRequisitionDecisionEmail } from "@/lib/email";
import type { Requisition } from "@/lib/types";

async function baseUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

/**
 * Best-effort: notifies the person who submitted a requisition (in-app +
 * email), plus every school_admin at that school, that it's been decided
 * or paid. Never lets a notification hiccup fail the underlying action —
 * callers just fire this after the mutation succeeds.
 *
 * A paid "payroll" requisition additionally notifies every super_admin:
 * Bonté Service (Treasury) has released the funds for that period, which
 * is the platform's signal for the super_admin to generate and send that
 * school's payslips.
 */
async function notifyRequisitionUpdate(
  orgOwnerId: string,
  requisition: Requisition,
  kind: "requisition_approved" | "requisition_rejected" | "requisition_paid",
  payslipCount?: number,
) {
  try {
    const [state, schoolAdminIds] = await Promise.all([
      getWorkspace(orgOwnerId),
      listUserIdsByRole(orgOwnerId, ["school_admin"], requisition.clientId),
    ]);
    const client = state.clients.find((c) => c.id === requisition.clientId);
    const categoryLabel = CATEGORY_LABEL[requisition.category];

    const recipientIds = requisition.submittedByUserId
      ? [requisition.submittedByUserId, ...schoolAdminIds]
      : schoolAdminIds;

    const title =
      kind === "requisition_paid"
        ? "Requisition paid"
        : kind === "requisition_approved"
          ? "Requisition approved"
          : "Requisition rejected";
    const message =
      kind === "requisition_paid"
        ? `Your ${categoryLabel} for ${requisition.amountRequested} (${requisition.description}) has been paid out.`
        : `Your ${categoryLabel} for ${requisition.amountRequested} (${requisition.description}) was ${
            kind === "requisition_approved" ? "approved" : "rejected"
          }${requisition.decisionNote ? ` — ${requisition.decisionNote}` : ""}.`;

    await notifyUsers(recipientIds, {
      orgOwnerId,
      clientId: requisition.clientId,
      type: kind,
      title,
      message,
      link: "/portal",
    });

    // Payroll funds paid out by Treasury → their payslips are already
    // generated as drafts (see generatePayslipsForPaidPayrollScoped); hand
    // off to the super_admin to review and send them.
    if (kind === "requisition_paid" && requisition.category === "payroll") {
      const superAdminIds = await listUserIdsByRole(orgOwnerId, ["super_admin"]);
      const schoolName = client?.name ?? "a school";
      const periodPart = requisition.period ? ` for ${requisition.period}` : "";
      const message =
        payslipCount !== undefined
          ? `Bonté Service paid out ${categoryLabel} of ${requisition.amountRequested} for ${schoolName}${periodPart} — ${payslipCount} payslip${payslipCount === 1 ? "" : "s"} ${payslipCount === 1 ? "has" : "have"} been generated and are ready to review and send.`
          : `Bonté Service paid out ${categoryLabel} of ${requisition.amountRequested} for ${schoolName}${periodPart} — payslips can now be generated and sent.`;
      await notifyUsers(superAdminIds, {
        orgOwnerId,
        clientId: requisition.clientId,
        type: "requisition_paid",
        title: "Payroll funds released",
        message,
        link: "/send-payslips",
      });
    }

    if (client && requisition.submittedByUserId && kind !== "requisition_paid") {
      const submitter = await findUserById(requisition.submittedByUserId);
      if (submitter) {
        await sendRequisitionDecisionEmail({
          orgOwnerId,
          to: submitter.email,
          submittedByName: submitter.name,
          schoolName: client.name,
          categoryLabel,
          description: requisition.description,
          amountRequested: requisition.amountRequested,
          currency: client.currency,
          decision: kind === "requisition_approved" ? "approved" : "rejected",
          decisionNote: requisition.decisionNote,
          link: `${await baseUrl()}/portal`,
          clientId: requisition.clientId,
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify requisition update:", err);
  }
}

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
      const requisition = await decideRequisitionScoped(
        session.user.orgOwnerId,
        id,
        body.action === "approve" ? "approved" : "rejected",
        body.note?.trim() || undefined,
        actor,
      );
      if (requisition) {
        await notifyRequisitionUpdate(
          session.user.orgOwnerId,
          requisition,
          body.action === "approve" ? "requisition_approved" : "requisition_rejected",
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "pay") {
      if (!(Number(body.paidAmount) > 0) || !body.paymentMethod?.trim()) {
        return NextResponse.json(
          { error: "A paid amount and payment method are required." },
          { status: 400 },
        );
      }
      const requisition = await markRequisitionPaidScoped(
        session.user.orgOwnerId,
        id,
        Number(body.paidAmount),
        body.paymentMethod.trim(),
        actor,
      );
      if (requisition) {
        let payslipCount: number | undefined;
        if (requisition.category === "payroll" && requisition.period) {
          const generated = await generatePayslipsForPaidPayrollScoped(
            session.user.orgOwnerId,
            requisition.clientId,
            requisition.period,
            actor,
          );
          payslipCount = generated.length;
        }
        await notifyRequisitionUpdate(
          session.user.orgOwnerId,
          requisition,
          "requisition_paid",
          payslipCount,
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("Failed to update requisition — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
