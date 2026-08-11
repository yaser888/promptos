import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import {
  updateSocialLink,
  deleteSocialLink,
  validateSocialLinkPatch,
} from "@/engine/socials/socials.service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await req.json();
    const patch: Partial<Record<string, unknown>> = {};
    for (const field of ["label", "url", "icon", "sortOrder", "isActive"]) {
      if (body[field] !== undefined) patch[field] = body[field];
    }
    const errors = validateSocialLinkPatch(patch);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }

    const link = await updateSocialLink(id, patch);
    if (!link) return NextResponse.json({ error: "Social link not found" }, { status: 404 });
    await auditFromRequest(req, "update", "social-links", id, session);
    return NextResponse.json({ ok: true, link });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to update social link" }, { status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const ok = await deleteSocialLink(id);
    if (!ok) return NextResponse.json({ error: "Social link not found" }, { status: 404 });
    await auditFromRequest(req, "delete", "social-links", id, session);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to delete social link" }, { status });
  }
}
