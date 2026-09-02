import { NextResponse } from "next/server";
import auth from "@/auth";
import { getEffectiveOrgOwnerId } from "@/lib/active-org";
import { getEmailConfig, saveClientSenderIdentity } from "@/lib/db/email-config";
import { getWorkspace } from "@/lib/db/workspace";
import { emailService } from "@/lib/email-service";

/** List every school plus its own sender identity override, if it has one. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    const [state, config] = await Promise.all([
      getWorkspace(orgOwnerId),
      getEmailConfig(orgOwnerId),
    ]);

    const schools = state.clients
      .filter((c) => !c.deletedAt)
      .map((c) => {
        const override = config?.clientIdentities?.[c.id];
        return {
          clientId: c.id,
          name: c.name,
          identity: override
            ? { fromName: override.fromName, fromEmail: override.fromEmail, replyTo: override.replyTo ?? "" }
            : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ schools });
  } catch (err) {
    console.error("Failed to load per-school email identities:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

interface SaveBody {
  clientId?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

/** Sets one school's "from" identity override. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.clientId) {
    return NextResponse.json({ error: "A clientId is required." }, { status: 400 });
  }
  if (!body.fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.fromEmail)) {
    return NextResponse.json({ error: "A valid 'from' email address is required." }, { status: 400 });
  }
  if (!body.fromName?.trim()) {
    return NextResponse.json({ error: "A 'from' name is required." }, { status: 400 });
  }

  try {
    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    await saveClientSenderIdentity(orgOwnerId, body.clientId, {
      fromName: body.fromName.trim(),
      fromEmail: body.fromEmail.trim(),
      replyTo: body.replyTo?.trim() || undefined,
    });
    emailService.clearCache(orgOwnerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save school email identity:", err);
    return NextResponse.json({ error: "Could not save this school's sender identity." }, { status: 500 });
  }
}

/** Clears one school's override — it goes back to using the org default. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { clientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.clientId) {
    return NextResponse.json({ error: "A clientId is required." }, { status: 400 });
  }

  try {
    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    await saveClientSenderIdentity(orgOwnerId, body.clientId, null);
    emailService.clearCache(orgOwnerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to clear school email identity:", err);
    return NextResponse.json({ error: "Could not reset this school's sender identity." }, { status: 500 });
  }
}
