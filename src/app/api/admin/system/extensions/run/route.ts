import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import { prisma } from "@/lib/prisma";
import { getCatalogEntry } from "@/engine/extensions/catalog";
import { logWarn } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const cookieHeader = req.headers.get("cookie");
    const csrfHeader = req.headers.get(CSRF_HEADER);
    if (!verifyCsrf(cookieHeader, csrfHeader)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const rl = await checkRateLimit(req, { namespace: "admin/extensions", limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const slug = String(body?.slug ?? "");

    const ext = await prisma.extension.findUnique({ where: { slug } });
    if (!ext || ext.state !== "ACTIVE") {
      return NextResponse.json({ error: "Extension is not active" }, { status: 404 });
    }

    const entry = getCatalogEntry(slug);
    if (!entry?.hooks?.daily) {
      return NextResponse.json({ error: "This extension has no runnable task" }, { status: 400 });
    }

    try {
      await entry.hooks.daily({
        extensionId: ext.id,
        slug: ext.slug,
        name: ext.name,
        version: ext.version,
        config: (ext.config ?? {}) as Record<string, unknown>,
      });
      await prisma.extensionLog.create({
        data: {
          extensionId: ext.id,
          level: "info",
          message: "Manual run completed successfully",
        },
      });
      return NextResponse.json({ ok: true, result: { ok: true } });
    } catch (error: any) {
      await prisma.extensionLog.create({
        data: {
          extensionId: ext.id,
          level: "error",
          message: `Manual run failed: ${String(error?.message ?? error)}`,
        },
      });
      logWarn("extensions", `Manual run failed for ${slug}`, { error: String(error) });
      return NextResponse.json(
        { ok: false, result: { ok: false, error: String(error?.message ?? error) } },
        { status: 500 }
      );
    }
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to run extension" }, { status });
  }
}
