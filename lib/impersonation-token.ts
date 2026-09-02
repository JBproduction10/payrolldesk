import crypto from "crypto";

const TOKEN_TTL_MS = 60 * 1000; // 60 seconds — exchanged for a session immediately, never stored

export interface ImpersonationPayload {
  /** The user to sign in as. */
  targetUserId: string;
  /**
   * The platform_admin who initiated this. Present when *entering*
   * impersonation; omitted when *exiting* back to the platform_admin's own
   * account.
   */
  impersonatorId?: string;
  /** Display name of the impersonator, carried through for the UI banner. */
  impersonatorName?: string;
  exp: number;
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) {
    throw new Error("NEXTAUTH_SECRET is not set — required to sign impersonation tokens.");
  }
  return s;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Signs a short-lived, single-purpose handoff token. Not a general JWT — just enough for this one exchange. */
export function signImpersonationToken(
  params: Omit<ImpersonationPayload, "exp">,
): string {
  const payload: ImpersonationPayload = { ...params, exp: Date.now() + TOKEN_TTL_MS };
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(crypto.createHmac("sha256", secret()).update(body).digest());
  return `${body}.${signature}`;
}

/** Verifies signature + expiry. Returns null on anything invalid — caller decides what that means. */
export function verifyImpersonationToken(token: string): ImpersonationPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const expected = base64url(crypto.createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ImpersonationPayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
