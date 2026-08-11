import crypto from "crypto";

const COOKIE_NAME = "promptos_csrf";

function csrfSecret(): string {
  return process.env.ADMIN_ACCESS_KEY || "promptos-csrf-dev-secret";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", csrfSecret()).update(value).digest("base64url");
}

/** Issues a fresh CSRF cookie value: `<random>.<sig>`. */
export function issueCsrfToken(): { value: string; cookie: string } {
  const token = crypto.randomBytes(24).toString("base64url");
  const value = `${token}.${sign(token)}`;
  return {
    value,
    cookie: `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  };
}

/**
 * Double-submit style verification: the client echoes the token value it
 * received from `/api/admin/system/csrf` via the `x-csrf-token` header, and
 * the server compares it against the signed HttpOnly cookie it issued.
 */
export function verifyCsrf(cookieHeader: string | null, headerValue: string | null): boolean {
  if (!cookieHeader || !headerValue) return false;
  const cookieMatch = cookieHeader.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!cookieMatch) return false;
  const cookieToken = cookieMatch.slice(COOKIE_NAME.length + 1);
  const dot = cookieToken.lastIndexOf(".");
  if (dot <= 0) return false;
  const token = cookieToken.slice(0, dot);
  const sig = cookieToken.slice(dot + 1);
  if (token.length < 16) return false;
  const expected = sign(token);
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqualStr(sig, expected)) return false;
  return timingSafeEqualStr(headerValue, cookieToken);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export { COOKIE_NAME };

export const CSRF_HEADER = "x-csrf-token";