import { NextResponse } from "next/server";
import auth from "@/auth";
import { headers } from "next/headers";
import { CATEGORY_LABEL, getWorkspace, submitRequisitionScoped } from "@/lib/db/workspace";
import { listUserIdsByRole, findUserById } from "@/lib/db/users";
import { notifyUsers } from "@/lib/db/notifications";
import { sendRequisitionSubmittedEmail } from "@/lib/email";
import type { RequisitionCategory } from "@/lib/types";

async function baseUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

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

    // Best-effort: let Treasury know a new requisition needs a decision.
    // Never let a notification/email hiccup fail the submission itself.
    try {
      const [state, treasuryIds] = await Promise.all([
        getWorkspace(session.user.orgOwnerId),
        listUserIdsByRole(session.user.orgOwnerId, ["treasury"]),
      ]);
      const client = state.clients.find((c) => c.id === session.user.clientId);
      const categoryLabel = CATEGORY_LABEL[requisition.category];
      const title = "New requisition";
      const message = `${requisition.submittedBy} at ${client?.name ?? "a school"} submitted a ${categoryLabel} for ${requisition.amountRequested} (${client?.currency ?? ""}): ${requisition.description}`;

      await notifyUsers(treasuryIds, {
        orgOwnerId: session.user.orgOwnerId,
        clientId: requisition.clientId,
        type: "requisition_submitted",
        title,
        message,
        link: "/portal",
      });

      if (client) {
        const link = `${await baseUrl()}/portal`;
        const treasuryUsers = await Promise.all(treasuryIds.map((id) => findUserById(id)));
        await Promise.all(
          treasuryUsers
            .filter((u): u is NonNullable<typeof u> => Boolean(u))
            .map((u) =>
              sendRequisitionSubmittedEmail({
                orgOwnerId: session.user.orgOwnerId,
                to: u.email,
                treasuryName: u.name,
                schoolName: client.name,
                submittedBy: requisition.submittedBy,
                categoryLabel,
                description: requisition.description,
                amountRequested: requisition.amountRequested,
                currency: client.currency,
                link,
                clientId: requisition.clientId,
              }),
            ),
        );
      }
    } catch (notifyErr) {
      console.error("Failed to notify Treasury of new requisition:", notifyErr);
    }

    return NextResponse.json({ requisition });
  } catch (err) {
    console.error("Failed to submit requisition — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
