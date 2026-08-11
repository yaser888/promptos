import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { issueCsrfToken, COOKIE_NAME } from "@/core/security/csrf";

export async function GET() {
  try {
    await requireAdmin();
    const { value, cookie } = issueCsrfToken();
    return NextResponse.json(
      { token: value },
      { headers: { "set-cookie": cookie, "x-csrf-cookie": COOKIE_NAME } }
    );
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to issue CSRF token" }, { status });
  }
}