import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import {
  listExtensions,
  installExtension,
  validateManifest,
} from "@/engine/extensions/extensions.service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const rl = await checkRateLimit(req, { namespace: "admin/extensions", limit: 120, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "x-ratelimit-reset": String(rl.resetAt) } }
      );
    }

    const extensions = await listExtensions();
    return NextResponse.json({ ok: true, extensions });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch extensions" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/extensions", limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const manifest = body?.manifest;

    const validation = validateManifest(manifest);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors.join("; ") }, { status: 400 });
    }

    const result = await installExtension(manifest);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    await auditFromRequest(req, "install", "extensions", validation.manifest.slug, session);
    return NextResponse.json({ ok: true, id: result.id, slug: validation.manifest.slug });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to install extension" }, { status });
  }
}