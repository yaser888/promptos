import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import {
  listSocialLinks,
  ensureSocialLinks,
  createSocialLink,
  validateSocialLink,
} from "@/engine/socials/socials.service";

export async function GET() {
  try {
    await requireAdmin();
    await ensureSocialLinks();
    const links = await listSocialLinks();
    return NextResponse.json({ ok: true, links });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch social links" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();

    const cookieHeader = req.headers.get("cookie");
    const csrfHeader = req.headers.get(CSRF_HEADER);
    if (!verifyCsrf(cookieHeader, csrfHeader)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const rl = await checkRateLimit(req, { namespace: "admin/social-links", limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const errors = validateSocialLink(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }

    const link = await createSocialLink(body);
    await auditFromRequest(req, "create", "social-links", link.id, session);
    return NextResponse.json({ ok: true, link });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to create social link" }, { status });
  }
}
