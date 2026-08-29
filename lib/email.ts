import { emailService } from "./email-service";

export interface SendResult {
  sent: boolean;
  /** Always returned so an authenticated caller can show/copy it as a fallback. */
  link: string;
}

async function sendVia(
  orgOwnerId: string,
  notificationType: "invite" | "passwordReset",
  params: { to: string; subject: string; html: string; link: string },
): Promise<SendResult> {
  const result = await emailService.send(
    orgOwnerId,
    { to: params.to, subject: params.subject, html: params.html },
    notificationType,
  );
  if (!result.success) {
    console.error(`[email failed] ${params.to}: ${result.error ?? "unknown error"} — link: ${params.link}`);
  }
  return { sent: result.success, link: params.link };
}

/* ------------------------------ invite email ------------------------------ */

export interface InviteEmailParams {
  orgOwnerId: string;
  to: string;
  name: string;
  link: string;
  roleLabel: string;
  orgName: string;
}

/**
 * Sends the "set your password" invite email using the sending org's
 * configured provider (Settings → Email), falling back to the
 * RESEND_API_KEY env var if that org hasn't configured one. On any
 * failure this logs the link to the server console and returns
 * sent:false so the caller can surface the link directly in the UI
 * instead — nothing about account creation ever depends on email
 * actually working. Safe to fall back to showing the link because this
 * is only ever called from an authenticated super_admin action.
 */
export async function sendInviteEmail(params: InviteEmailParams): Promise<SendResult> {
  return sendVia(params.orgOwnerId, "invite", {
    to: params.to,
    subject: `You've been added to ${params.orgName} on Payroll Desk`,
    html: renderInviteHtml(params),
    link: params.link,
  });
}

function renderInviteHtml({ name, link, roleLabel, orgName }: InviteEmailParams): string {
  return wrapEmailHtml({
    heading: `You're invited to ${escapeHtml(orgName)}`,
    body: `Hi ${escapeHtml(name)}, you've been given <strong>${escapeHtml(roleLabel)}</strong> access
      on Payroll Desk. Set your password to finish creating your account.`,
    buttonLabel: "Set your password",
    link,
    footnote: "This link expires in 7 days. If you weren't expecting this, you can ignore this email.",
  });
}

/* --------------------------- password reset email --------------------------- */

export interface PasswordResetEmailParams {
  orgOwnerId: string;
  to: string;
  name: string;
  link: string;
}

/**
 * Sends a "reset your password" email. Unlike sendInviteEmail, the caller
 * (the public /forgot-password endpoint) must NEVER return this result's
 * link back in an API response — only log/email it — or anyone could hijack
 * an account just by knowing its email address.
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<SendResult> {
  return sendVia(params.orgOwnerId, "passwordReset", {
    to: params.to,
    subject: "Reset your Payroll Desk password",
    html: renderResetHtml(params),
    link: params.link,
  });
}

function renderResetHtml({ name, link }: PasswordResetEmailParams): string {
  return wrapEmailHtml({
    heading: "Reset your password",
    body: `Hi ${escapeHtml(name)}, we received a request to reset your Payroll Desk
      password. Click below to choose a new one.`,
    buttonLabel: "Reset password",
    link,
    footnote:
      "This link expires in 7 days. If you didn't request this, you can safely ignore this email — your password won't change.",
  });
}

/* ------------------------------ payslip email ------------------------------ */

export interface PayslipEmailLine {
  label: string;
  amount: number;
}

export interface PayslipEmailParams {
  orgOwnerId: string;
  to: string;
  employeeName: string;
  schoolName: string;
  periodLabel: string;
  currency: string;
  earnings: PayslipEmailLine[];
  deductions: PayslipEmailLine[];
  gross: number;
  totalDeductions: number;
  net: number;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Sends an actual payslip email using the org's configured provider.
 * Unlike sendInviteEmail/sendPasswordResetEmail, this has no "link" concept
 * to fall back to — a payslip is the payload itself, not something you
 * visit a URL for — so on failure the caller should mark the delivery as
 * failed rather than pretend it went out.
 */
export async function sendPayslipEmail(
  params: PayslipEmailParams,
): Promise<{ sent: boolean }> {
  const result = await emailService.send(
    params.orgOwnerId,
    {
      to: params.to,
      subject: `Your ${params.periodLabel} payslip — ${params.schoolName}`,
      html: renderPayslipHtml(params),
    },
    "payslip",
  );
  if (!result.success) {
    console.error(
      `[payslip email failed] ${params.to}: ${result.error ?? "unknown error"} — ${params.periodLabel} payslip for ${params.employeeName}`,
    );
  }
  return { sent: result.success };
}

function renderPayslipHtml(params: PayslipEmailParams): string {
  const row = (l: PayslipEmailLine, sign: "+" | "−") => `
    <tr>
      <td style="padding:4px 0;color:#4b463d;">${escapeHtml(l.label)}</td>
      <td style="padding:4px 0;text-align:right;color:${sign === "+" ? "#1f5c40" : "#9a3b2b"};">
        ${sign}${money(l.amount, params.currency)}
      </td>
    </tr>`;

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #24211d;">
      <h2 style="margin-bottom: 4px;">${escapeHtml(params.schoolName)}</h2>
      <p style="color: #6b6558; margin-top: 0;">
        Payslip for ${params.periodLabel} — ${escapeHtml(params.employeeName)}
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="font-size:11px;letter-spacing:.04em;color:#b8860b;text-transform:uppercase;padding-bottom:6px;">Earnings</td>
          <td></td>
        </tr>
        ${params.earnings.map((l) => row(l, "+")).join("")}
        <tr>
          <td style="padding-top:8px;border-top:1px solid #e6e0d4;font-weight:600;">Gross Pay</td>
          <td style="padding-top:8px;border-top:1px solid #e6e0d4;text-align:right;font-weight:600;">
            ${money(params.gross, params.currency)}
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="font-size:11px;letter-spacing:.04em;color:#9a3b2b;text-transform:uppercase;padding-bottom:6px;">Deductions</td>
          <td></td>
        </tr>
        ${params.deductions.map((l) => row(l, "−")).join("")}
        <tr>
          <td style="padding-top:8px;border-top:1px solid #e6e0d4;font-weight:600;">Total Deductions</td>
          <td style="padding-top:8px;border-top:1px solid #e6e0d4;text-align:right;font-weight:600;color:#9a3b2b;">
            −${money(params.totalDeductions, params.currency)}
          </td>
        </tr>
      </table>

      <div style="margin-top:20px;background:#1f5c40;color:#fff;border-radius:10px;padding:16px 20px;
                  display:flex;justify-content:space-between;align-items:center;">
        <span style="opacity:.85;">Net Payable</span>
        <span style="font-size:20px;font-weight:700;">${money(params.net, params.currency)}</span>
      </div>

      <p style="color: #9a9384; font-size: 12px; margin-top: 20px;">
        This is an automated payslip email. If anything looks incorrect, contact your
        school administrator.
      </p>
    </div>
  `;
}

/* --------------------------- fee reminder email --------------------------- */

export interface FeeReminderEmailParams {
  orgOwnerId: string;
  to: string;
  studentName: string;
  className: string;
  schoolName: string;
  periodLabel: string;
  currency: string;
  amountDue: number;
}

export async function sendFeeReminderEmail(
  params: FeeReminderEmailParams,
): Promise<{ sent: boolean }> {
  const result = await emailService.send(
    params.orgOwnerId,
    {
      to: params.to,
      subject: `Fee reminder for ${params.studentName} — ${params.schoolName}`,
      html: renderFeeReminderHtml(params),
    },
    "feeReminder",
  );
  if (!result.success) {
    console.error(
      `[fee reminder failed] ${params.to}: ${result.error ?? "unknown error"} — ${params.studentName} owes ${money(params.amountDue, params.currency)} for ${params.periodLabel}`,
    );
  }
  return { sent: result.success };
}

function renderFeeReminderHtml(params: FeeReminderEmailParams): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#24211d;">
      <h2 style="margin-bottom:4px;">${escapeHtml(params.schoolName)}</h2>
      <p style="color:#6b6558;margin-top:0;">
        Fee reminder for ${escapeHtml(params.studentName)}
      </p>

      <div style="margin-top:20px;padding:16px 20px;background:#f7f4ed;border-radius:10px;">
        <p style="margin:0 0 6px;color:#6b6558;font-size:13px;">
          ${escapeHtml(params.periodLabel)} · ${escapeHtml(params.className)}
        </p>
        <p style="margin:0;font-size:24px;font-weight:700;">
          ${money(params.amountDue, params.currency)}
        </p>
      </div>

      <p style="color:#4b463d;line-height:1.6;">
        This is a friendly reminder that the school fee above is still outstanding.
        Please contact the school if you have already made the payment.
      </p>

      <p style="color:#9a9384;font-size:12px;margin-top:20px;">
        This is an automated message from Payroll Desk.
      </p>
    </div>
  `;
}

/* --------------------------- requisition emails --------------------------- */

export interface RequisitionSubmittedEmailParams {
  orgOwnerId: string;
  to: string;
  treasuryName: string;
  schoolName: string;
  submittedBy: string;
  categoryLabel: string;
  description: string;
  amountRequested: number;
  currency: string;
  link: string;
}

/** Notifies one Treasury account by email that a new requisition needs a decision. */
export async function sendRequisitionSubmittedEmail(
  params: RequisitionSubmittedEmailParams,
): Promise<{ sent: boolean }> {
  const result = await emailService.send(
    params.orgOwnerId,
    {
      to: params.to,
      subject: `New ${params.categoryLabel} from ${params.schoolName}`,
      html: renderRequisitionSubmittedHtml(params),
    },
    "requisition",
  );
  if (!result.success) {
    console.error(
      `[requisition email failed] ${params.to}: ${result.error ?? "unknown error"} — new ${params.categoryLabel} from ${params.schoolName}`,
    );
  }
  return { sent: result.success };
}

function renderRequisitionSubmittedHtml(params: RequisitionSubmittedEmailParams): string {
  return wrapEmailHtml({
    heading: "New requisition needs a decision",
    body: `Hi ${escapeHtml(params.treasuryName)}, ${escapeHtml(params.submittedBy)} at
      <strong>${escapeHtml(params.schoolName)}</strong> submitted a ${escapeHtml(params.categoryLabel)}
      for ${money(params.amountRequested, params.currency)}: ${escapeHtml(params.description)}.`,
    buttonLabel: "Review requisition",
    link: params.link,
    footnote: "You're receiving this because you're set up as Treasury on Payroll Desk.",
  });
}

export interface RequisitionDecisionEmailParams {
  orgOwnerId: string;
  to: string;
  submittedByName: string;
  schoolName: string;
  categoryLabel: string;
  description: string;
  amountRequested: number;
  currency: string;
  decision: "approved" | "rejected";
  decisionNote?: string;
  link: string;
}

/** Notifies whoever submitted a requisition once Treasury has approved or rejected it. */
export async function sendRequisitionDecisionEmail(
  params: RequisitionDecisionEmailParams,
): Promise<{ sent: boolean }> {
  const verb = params.decision === "approved" ? "approved" : "rejected";
  const result = await emailService.send(
    params.orgOwnerId,
    {
      to: params.to,
      subject: `Your requisition was ${verb} — ${params.schoolName}`,
      html: renderRequisitionDecisionHtml(params),
    },
    "requisition",
  );
  if (!result.success) {
    console.error(
      `[requisition email failed] ${params.to}: ${result.error ?? "unknown error"} — requisition ${verb}`,
    );
  }
  return { sent: result.success };
}

function renderRequisitionDecisionHtml(params: RequisitionDecisionEmailParams): string {
  const approved = params.decision === "approved";
  return wrapEmailHtml({
    heading: approved ? "Your requisition was approved" : "Your requisition was rejected",
    body: `Hi ${escapeHtml(params.submittedByName)}, your ${escapeHtml(params.categoryLabel)} for
      ${money(params.amountRequested, params.currency)} (${escapeHtml(params.description)}) has been
      <strong>${approved ? "approved" : "rejected"}</strong> by Treasury.${
        params.decisionNote ? ` Note: ${escapeHtml(params.decisionNote)}` : ""
      }`,
    buttonLabel: "View requisition",
    link: params.link,
    footnote: "This is an automated message from Payroll Desk.",
  });
}

/* --------------------------------- shared --------------------------------- */

function wrapEmailHtml(params: {
  heading: string;
  body: string;
  buttonLabel: string;
  link: string;
  footnote: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #24211d;">
      <h2 style="margin-bottom: 4px;">${params.heading}</h2>
      <p style="color: #6b6558;">${params.body}</p>
      <p style="margin: 24px 0;">
        <a href="${params.link}"
           style="background:#1f5c40;color:#fff;padding:10px 18px;border-radius:8px;
                  text-decoration:none;font-weight:600;display:inline-block;">
          ${params.buttonLabel}
        </a>
      </p>
      <p style="color: #9a9384; font-size: 12px;">${params.footnote}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
