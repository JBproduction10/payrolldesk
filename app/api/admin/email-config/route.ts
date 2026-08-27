import { NextResponse } from "next/server";
import auth from "@/auth";
import { getEmailConfig, saveEmailConfig, type EmailConfigDoc } from "@/lib/db/email-config";
import { emailService } from "@/lib/email-service";

/** Never send saved credentials back to the browser — only whether one is set. */
function toClientShape(config: EmailConfigDoc | null) {
  return {
    provider: config?.provider ?? "resend",
    fromName: config?.fromName ?? "Payroll Desk",
    fromEmail: config?.fromEmail ?? "",
    replyTo: config?.replyTo ?? "",
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
    const config = await getEmailConfig(session.user.orgOwnerId);
    return NextResponse.json(toClientShape(config));
  } catch (err) {
    console.error("Failed to load email config — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

interface SaveBody {
  provider?: "resend" | "sendgrid" | "smtp";
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
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

  if (!body.fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.fromEmail)) {
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

    const saved = await saveEmailConfig(session.user.orgOwnerId, {
      provider: body.provider,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo || undefined,
      ...(smtp && { smtp: smtp as EmailConfigDoc["smtp"] }),
      ...(sendgrid && { sendgrid }),
      ...(resend && { resend }),
      ...(body.notifications && { notifications: body.notifications as EmailConfigDoc["notifications"] }),
    });

    emailService.clearCache(session.user.orgOwnerId);

    return NextResponse.json(toClientShape(saved));
  } catch (err) {
    console.error("Failed to save email config:", err);
    return NextResponse.json({ error: "Could not save your email settings." }, { status: 500 });
  }
}
