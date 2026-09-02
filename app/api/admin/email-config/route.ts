import { NextResponse } from "next/server";
import auth from "@/auth";
import { getEffectiveOrgOwnerId } from "@/lib/active-org";
import { getEmailConfig, saveEmailConfig, type EmailConfigDoc } from "@/lib/db/email-config";
import { emailService } from "@/lib/email-service";

/** Never send saved credentials back to the browser — only whether one is set. */
function toClientShape(config: EmailConfigDoc | null) {
  return {
    provider: config?.provider ?? "resend",
    defaultIdentity: {
      fromName: config?.defaultIdentity?.fromName ?? "Payroll Desk",
      fromEmail: config?.defaultIdentity?.fromEmail ?? "",
      replyTo: config?.defaultIdentity?.replyTo ?? "",
    },
    smtp: {
      host: config?.smtp?.host ?? "",
      port: config?.smtp?.port ?? 587,
      secure: config?.smtp?.secure ?? false,
      user: config?.smtp?.user ?? "",
      hasPassword: Boolean(config?.smtp?.password),
    },
    sendgrid: { hasApiKey: Boolean(config?.sendgrid?.apiKey) },
    resend: { hasApiKey: Boolean(config?.resend?.apiKey) },
    notifications: {
      invite: config?.notifications?.invite ?? true,
      passwordReset: config?.notifications?.passwordReset ?? true,
      payslip: config?.notifications?.payslip ?? true,
      feeReminder: config?.notifications?.feeReminder ?? true,
      requisition: config?.notifications?.requisition ?? true,
    },
    configured: Boolean(config),
    updatedAt: config?.updatedAt ?? null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    const config = await getEmailConfig(orgOwnerId);
    return NextResponse.json(toClientShape(config));
  } catch (err) {
    console.error("Failed to load email config — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

interface SaveBody {
  provider?: "resend" | "sendgrid" | "smtp";
  defaultIdentity?: { fromName?: string; fromEmail?: string; replyTo?: string };
  smtp?: { host?: string; port?: number; secure?: boolean; user?: string; password?: string };
  sendgrid?: { apiKey?: string };
  resend?: { apiKey?: string };
  notifications?: Partial<EmailConfigDoc["notifications"]>;
}

export async function POST(req: Request) {
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

  const fromEmail = body.defaultIdentity?.fromEmail;
  if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    return NextResponse.json({ error: "A valid 'from' email address is required." }, { status: 400 });
  }

  try {
    // Blank credential fields mean "leave the saved one alone" (the client
    // never receives real secrets back, so it can't round-trip them) —
    // build only the sub-objects that actually have something new in them.
    const smtp =
      body.smtp && (body.smtp.host || body.smtp.password || body.smtp.user)
        ? {
            host: body.smtp.host ?? "",
            port: body.smtp.port ?? 587,
            secure: body.smtp.secure ?? false,
            user: body.smtp.user ?? "",
            ...(body.smtp.password ? { password: body.smtp.password } : {}),
          }
        : undefined;
    const sendgrid = body.sendgrid?.apiKey ? { apiKey: body.sendgrid.apiKey } : undefined;
    const resend = body.resend?.apiKey ? { apiKey: body.resend.apiKey } : undefined;

    const orgOwnerId = await getEffectiveOrgOwnerId(session);
    const saved = await saveEmailConfig(orgOwnerId, {
      provider: body.provider,
      defaultIdentity: {
        fromName: body.defaultIdentity?.fromName || "Payroll Desk",
        fromEmail,
        replyTo: body.defaultIdentity?.replyTo || undefined,
      },
      ...(smtp && { smtp: smtp as EmailConfigDoc["smtp"] }),
      ...(sendgrid && { sendgrid }),
      ...(resend && { resend }),
      ...(body.notifications && { notifications: body.notifications as EmailConfigDoc["notifications"] }),
    });

    emailService.clearCache(orgOwnerId);

    return NextResponse.json(toClientShape(saved));
  } catch (err) {
    console.error("Failed to save email config:", err);
    return NextResponse.json({ error: "Could not save your email settings." }, { status: 500 });
  }
}
