import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/core/security/rate-limit";
import { getVersionInfo } from "@/core/registry/version";

function pingRedis(timeoutMs = 2000): Promise<boolean> {
  return Promise.race([
    redis.ping().then((r) => r === "PONG").catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ]);
}

export async function GET(req: Request) {
  try {
    const session = await requireAdmin();

    const rl = await checkRateLimit(req, { namespace: "admin/system/center", limit: 120, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "x-ratelimit-reset": String(rl.resetAt) } }
      );
    }

    const [dbOk, redisOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1 as ok`.then(() => true).catch(() => false),
      pingRedis(),
    ]);

    const [
      usersCount,
      promptsCount,
      activeSubscriptions,
      pagesCount,
      extensionsCount,
      themesCount,
      backupsCount,
      audit24h,
      recentLogs,
      recentBackups,
      recentAudit,
      appliedUpdate,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.prompt.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.page.count(),
      prisma.extension.count(),
      prisma.theme.count(),
      prisma.systemBackup.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.systemLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.systemBackup.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.updateManifest.findFirst({ where: { status: "applied" }, orderBy: { appliedAt: "desc" } }),
    ]);

    const settings = await prisma.setting.findFirst();

    return NextResponse.json({
      ok: true,
      version: getVersionInfo(),
      health: { db: dbOk, redis: redisOk },
      runtime: {
        maintenanceMode: settings?.maintenanceMode ?? false,
        allowRegistration: settings?.allowRegistration ?? true,
        marketplaceEnabled: settings?.marketplaceEnabled ?? true,
        generatorEnabled: settings?.generatorEnabled ?? true,
        blogEnabled: settings?.blogEnabled ?? true,
      },
      counts: {
        users: usersCount,
        prompts: promptsCount,
        activeSubscriptions,
        pages: pagesCount,
        extensions: extensionsCount,
        themes: themesCount,
        backups: backupsCount,
      },
      security: {
        rateLimiting: true,
        csrfProtection: true,
        auditEnabled: true,
        auditLast24h: audit24h,
        adminSession: session.user ? { name: session.user.name, role: session.user.role } : null,
      },
      recents: {
        logs: recentLogs.map((l) => ({ id: l.id, level: l.level, source: l.source, message: l.message, createdAt: l.createdAt })),
        backups: recentBackups.map((b) => ({ id: b.id, kind: b.kind, label: b.label, sizeKb: b.sizeKb, createdAt: b.createdAt })),
        audit: recentAudit.map((a) => ({
          id: a.id,
          actorName: a.actorName,
          action: a.action,
          resource: a.resource,
          resourceId: a.resourceId,
          createdAt: a.createdAt,
        })),
      },
      lastAppliedUpdate: appliedUpdate
        ? { version: appliedUpdate.version, title: appliedUpdate.title, appliedAt: appliedUpdate.appliedAt }
        : null,
    });
  } catch (error: any) {
    console.error("Error fetching system center:", error);
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch system center" }, { status });
  }
}