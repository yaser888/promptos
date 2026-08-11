import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import { prisma } from "@/lib/prisma";
import {
  setActiveTheme,
  updateTheme,
  deleteTheme,
  validateThemes,
} from "@/engine/themes/themes.service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const theme = await prisma.theme.findUnique({ where: { id } });
    if (!theme) return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      theme: {
        id: theme.id,
        name: theme.name,
        slug: theme.slug,
        description: theme.description,
        tokens: theme.tokens,
        isPreset: theme.isPreset,
        isActive: theme.isActive,
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
      },
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch theme" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/themes", limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.isActive === true) {
      const result = await setActiveTheme(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      await auditFromRequest(req, "apply", "themes", id, session);
      return NextResponse.json({ ok: true, active: result.data.id });
    }

    const result = await updateTheme(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      tokens: typeof body.tokens === "object" && body.tokens !== null ? body.tokens : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Theme not found" ? 404 : 400 }
      );
    }
    await auditFromRequest(req, "update", "themes", id, session);
    return NextResponse.json({ ok: true, theme: result.data });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to update theme" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/themes", limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const result = await deleteTheme(id);
    if (!result.ok) {
      const isPreset = result.error.includes("Preset");
      return NextResponse.json({ error: result.error }, { status: isPreset ? 403 : 409 });
    }
    await auditFromRequest(req, "delete", "themes", id, session);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to delete theme" }, { status });
  }
}

// Re-export for lint cleanliness
void validateThemes;