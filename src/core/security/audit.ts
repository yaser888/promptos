import { prisma } from "@/lib/prisma";
import type { ServerSession } from "@/lib/server-auth";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "login"
  | "logout"
  | "download"
  | "export"
  | "import"
  | "install"
  | "uninstall"
  | "enable"
  | "disable"
  | "apply"
  | "rollback"
  | "execute"
  | "publish"
  | "unpublish"
  | "autosave"
  | "clone"
  | "login_failed"
  | "permission_denied";

const SENSITIVE_KEYS = /password|secret|token|key|signature|authorization|credential/i;

function sanitize(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(sanitize);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k)) {
        out[k] = "***";
        continue;
      }
      out[k] = sanitize(v);
    }
    return out;
  }
  return input;
}

export interface AuditOptions {
  actor?: ServerSession | null;
  ip?: string;
  details?: Record<string, unknown>;
}

/**
 * Best-effort security audit trail. Never throws — parent request integrity
 * must not depend on audit persistence.
 */
export async function audit(
  action: AuditAction,
  resource: string,
  resourceId?: string | null,
  opts: AuditOptions = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId: resourceId || null,
        actorId: opts.actor?.user?.id ?? null,
        actorName: opts.actor?.user?.name ?? null,
        actorRole: opts.actor?.user?.role ?? null,
        ip: opts.ip ?? null,
        details: opts.details ? (sanitize(opts.details) as any) : undefined,
      },
    });
  } catch (err) {
    console.error("audit: failed to persist", err);
  }
}

/** Inspect a request for a client IP without leaking headers. */
export async function auditFromRequest(
  req: Request,
  action: AuditAction,
  resource: string,
  resourceId?: string | null,
  actor?: ServerSession | null
): Promise<void> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  await audit(action, resource, resourceId, { actor, ip });
}