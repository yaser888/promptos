import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import { prisma } from "@/lib/prisma";
import {
  updatePage,
  autosavePage,
  setPageStatus,
  deletePage,
  validateBlocks,
  validateSlug,
} from "@/engine/pages/pages.service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ ok: true, page });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch page" }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();

    const cookieHeader = req.headers.get("cookie");
    const csrfHeader = req.headers.get(CSRF_HEADER);
    if (!verifyCsrf(cookieHeader, csrfHeader)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const rl = await checkRateLimit(req, { namespace: "admin/pages", limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.action === "autosave") {
      const result = await autosavePage(id, {
        content: body.content,
        seo: typeof body.seo === "object" && body.seo !== null ? body.seo : undefined,
      });
      if (!result.ok || !result.data) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
    }

    if (body.action === "publish" || body.action === "unpublish") {
      const status = body.action === "publish" ? "published" : "draft";
      const result = await setPageStatus(id, status);
      if (!result.ok || !result.data) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      await auditFromRequest(req, body.action, "pages", result.data.slug, session);
      return NextResponse.json({ ok: true, page: result.data });
    }

    if (body.slug !== undefined && body.slug !== null) {
      const slugError = validateSlug(String(body.slug).trim());
      if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });
    }
    if (body.content !== undefined) {
      const contentError = validateBlocks(body.content);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
    }

    const result = await updatePage(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      content: body.content,
      seo: body.seo !== undefined ? body.seo : undefined,
      isPublic: typeof body.isPublic === "boolean" ? body.isPublic : undefined,
      requiresAuth: typeof body.requiresAuth === "boolean" ? body.requiresAuth : undefined,
      permissions: body.permissions !== undefined ? body.permissions : undefined,
      status: body.status === "published" || body.status === "draft" ? body.status : undefined,
    });
    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Page not found" ? 404 : 409 }
      );
    }
    await auditFromRequest(req, "update", "pages", result.data.slug, session);
    return NextResponse.json({ ok: true, page: result.data });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to update page" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/pages", limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const result = await deletePage(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    await auditFromRequest(req, "delete", "pages", id, session);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to delete page" }, { status });
  }
}