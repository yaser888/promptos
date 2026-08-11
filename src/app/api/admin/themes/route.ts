import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import {
  ensureThemes,
  listThemes,
  createTheme,
  validateThemes,
} from "@/engine/themes/themes.service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const rl = await checkRateLimit(req, { namespace: "admin/themes", limit: 120, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "x-ratelimit-reset": String(rl.resetAt) } }
      );
    }

    await ensureThemes();
    const themes = await listThemes();
    return NextResponse.json({ ok: true, themes });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch themes" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/themes", limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    if (body.import) {
      // Import format: { name?, slug?, description?, tokens: {...} }
      const imported = body.import as Record<string, unknown>;
      const result = await createTheme({
        name: typeof imported.name === "string" ? imported.name : `Imported ${new Date().toDateString()}`,
        slug: typeof imported.slug === "string" ? imported.slug : undefined,
        description: typeof imported.description === "string" ? imported.description : undefined,
        tokens: (imported.tokens ?? {}) as Record<string, string>,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      await auditFromRequest(req, "import", "themes", result.data.slug, session);
      return NextResponse.json({ ok: true, theme: result.data });
    }

    const name = typeof body.name === "string" ? body.name : "";
    const slug = typeof body.slug === "string" ? body.slug : undefined;
    const description = typeof body.description === "string" ? body.description : undefined;
    const tokens = (body.tokens ?? {}) as Record<string, string>;
    const baseSlug = typeof body.baseSlug === "string" ? body.baseSlug : undefined;

    if (tokens && Object.keys(tokens).length > 0) {
      const errs = validateThemes(tokens);
      if (errs.length > 0) {
        return NextResponse.json({ error: errs.join("; ") }, { status: 400 });
      }
    }

    const result = await createTheme({ name, slug, description, tokens, baseSlug });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    await auditFromRequest(req, "create", "themes", result.data.slug, session);
    return NextResponse.json({ ok: true, theme: result.data });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to create theme" }, { status });
  }
}