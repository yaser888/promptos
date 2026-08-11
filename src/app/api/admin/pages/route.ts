import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import { createPage, validateBlocks } from "@/engine/pages/pages.service";
import { listAllSitePages } from "@/engine/site-pages/site-pages.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const rl = await checkRateLimit(req, { namespace: "admin/pages", limit: 120, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "x-ratelimit-reset": String(rl.resetAt) } }
      );
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase() || "";
    const status = url.searchParams.get("status");
    const visibility = url.searchParams.get("visibility");

    const pages = await prisma.page.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      where: {
        ...(search
          ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] }
          : {}),
        ...(status ? { status } : {}),
        ...(visibility === "public" ? { isPublic: true } : {}),
        ...(visibility === "private" ? { isPublic: false } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isPublic: true,
        requiresAuth: true,
        version: true,
        clonedFromId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const sitePages = await listAllSitePages();
    return NextResponse.json({ ok: true, pages, sitePages });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch pages" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/pages", limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const content = body.content ?? [];
    const contentError = validateBlocks(content);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }

    const result = await createPage({
      title: String(body.title ?? ""),
      slug: typeof body.slug === "string" ? body.slug : undefined,
      content,
      seo: typeof body.seo === "object" && body.seo !== null ? body.seo : undefined,
      isPublic: typeof body.isPublic === "boolean" ? body.isPublic : undefined,
      requiresAuth: typeof body.requiresAuth === "boolean" ? body.requiresAuth : undefined,
      permissions:
        typeof body.permissions === "object" && body.permissions !== null ? body.permissions : undefined,
      status: body.status === "published" ? "published" : "draft",
    });
    if (!result.ok || !result.data) {
      const isConflict = (result.error ?? "").includes("already exists");
      return NextResponse.json({ error: result.error }, { status: isConflict ? 409 : 400 });
    }

    await auditFromRequest(req, "create", "pages", result.data.slug, session);
    return NextResponse.json({ ok: true, page: result.data });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to create page" }, { status });
  }
}