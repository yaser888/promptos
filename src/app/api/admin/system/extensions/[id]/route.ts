import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { checkRateLimit } from "@/core/security/rate-limit";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import {
  setExtensionState,
  removeExtension,
  getExtensionLogs,
  updateExtensionConfig,
} from "@/engine/extensions/extensions.service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const logs = await getExtensionLogs(id, 30);
    return NextResponse.json({ ok: true, logs });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch extension logs" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/extensions", limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body?.config !== undefined) {
      const updated = await updateExtensionConfig(id, body.config);
      if (!updated.ok) {
        return NextResponse.json({ error: updated.error }, { status: 404 });
      }
      await auditFromRequest(req, "update", "extensions", id, session);
      return NextResponse.json({ ok: true, config: updated.config });
    }

    const state = body?.state as "ACTIVE" | "DISABLED" | undefined;
    if (state !== "ACTIVE" && state !== "DISABLED") {
      return NextResponse.json({ error: "state must be ACTIVE or DISABLED" }, { status: 400 });
    }

    const result = await setExtensionState(id, state);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    await auditFromRequest(req, state === "ACTIVE" ? "enable" : "disable", "extensions", id, session);
    return NextResponse.json({ ok: true, state: result.state });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to update extension" }, { status });
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

    const rl = await checkRateLimit(req, { namespace: "admin/extensions", limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const result = await removeExtension(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Extension not found" }, { status: 404 });
    }

    await auditFromRequest(req, "uninstall", "extensions", id, session);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to remove extension" }, { status });
  }
}