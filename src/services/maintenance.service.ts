import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { logInfo, logWarn } from "@/lib/logger";

const BACKUP_MODELS = [
  "setting",
  "category",
  "tag",
  "plan",
  "planFeature",
  "paymentMethod",
  "discountCode",
  "source",
  "user",
  "subscription",
  "collection",
  "template",
  "prompt",
  "promptVersion",
  "promptTranslation",
  "favorite",
  "usage",
  "importJob",
  "blogPost",
] as const;

function serialize(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") {
    const out: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "password" || k === "passwordHash") continue;
      out[k] = serialize(v);
    }
    return out;
  }
  return value;
}

async function buildBackup(): Promise<{ data: Record<string, any[]>; rowCount: number }> {
  const dump: Record<string, any[]> = {};
  let rowCount = 0;
  for (const model of BACKUP_MODELS as readonly string[]) {
    const rows = [];
    try {
      let cursor: any = null;
      for (;;) {
        const page = await (prisma as any)[model].findMany(
          cursor
            ? { cursor: { id: cursor }, skip: 1, take: 500, orderBy: { id: "asc" } }
            : { take: 500, orderBy: { id: "asc" } }
        );
        rows.push(...page);
        if (page.length < 500) break;
        cursor = page[page.length - 1].id;
      }
    } catch {
      try {
        rows.push(...(await (prisma as any)[model].findMany()));
      } catch {
        // skip unreadable model
      }
    }
    dump[model] = rows.map(serialize);
    rowCount += rows.length;
  }
  return { data: dump, rowCount };
}

async function cleanupTasks(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const purged = await prisma.prompt.deleteMany({ where: { isDeleted: true } });
  results.purgedDeletedPrompts = purged.count;

  const prompts = await prisma.prompt.findMany({
    where: { categoryId: { not: null } },
    select: { id: true, categoryId: true },
  });
  const cats = await prisma.category.findMany({ select: { id: true } });
  const catIds = new Set(cats.map((c) => c.id));
  const orphans = prompts.filter((p) => !catIds.has(p.categoryId!));
  for (let i = 0; i < orphans.length; i += 200) {
    const batch = orphans.slice(i, i + 200);
    await prisma.prompt.updateMany({
      where: { id: { in: batch.map((o) => o.id) } },
      data: { categoryId: null },
    });
  }
  results.fixedOrphanCategories = orphans.length;

  const dupRows: { id: string }[] = await prisma.$queryRawUnsafe(
    `WITH dups AS (
       SELECT MIN(id) AS keep, LOWER(LEFT(title, 200)) AS t, LOWER(LEFT(content, 500)) AS c
       FROM "Prompt" WHERE "isDeleted" = false
       GROUP BY t, c HAVING COUNT(*) > 1
     )
     SELECT p.id FROM "Prompt" p
     JOIN dups d ON LOWER(LEFT(p.title, 200)) = d.t AND LOWER(LEFT(p.content, 500)) = d.c
     WHERE p."isDeleted" = false AND p.id <> d.keep`
  );
  const dupIds = dupRows.map((r) => r.id);
  for (let i = 0; i < dupIds.length; i += 200) {
    const batch = dupIds.slice(i, i + 200);
    await prisma.prompt.updateMany({
      where: { id: { in: batch } },
      data: { isDeleted: true },
    });
  }
  results.markedDuplicatePrompts = dupIds.length;

  return results;
}

export interface MaintenanceResult {
  ok: boolean;
  health: { db: boolean; redis: boolean };
  cleanup: Record<string, number>;
  backup: { created: boolean; rowCount: number; kept: number } | null;
  prunedBackups: number;
  timestamp: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(null as unknown as T), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null as unknown as T);
      }
    );
  });
}

export async function runMaintenance(): Promise<MaintenanceResult> {
  let settings = await prisma.setting.findFirst();
  if (!settings) {
    settings = await prisma.setting.create({ data: {} });
  }

  const dbOk = await prisma
    .$queryRaw`SELECT 1 as ok`
    .then(() => true)
    .catch(() => false);

  let redisOk = false;
  try {
    redisOk = (await withTimeout(redis.ping(), 3000)) === "PONG";
  } catch {
    redisOk = false;
  }

  const cleanupEnabled = settings?.autoCleanupEnabled ?? true;
  const cleanup = cleanupEnabled ? await cleanupTasks() : {
    purgedDeletedPrompts: 0,
    fixedOrphanCategories: 0,
    markedDuplicatePrompts: 0,
  };

  let backupResult: { created: boolean; rowCount: number } | null = null;
  let pruned = 0;

  const backupEnabled = settings?.autoBackupEnabled ?? false;
  if (backupEnabled) {
    const { data, rowCount } = await buildBackup();
    const retention = Math.max(1, settings?.autoBackupRetention ?? 14);
    const sizeKb = Math.round(JSON.stringify(data).length / 1024);

    await prisma.systemBackup.create({
      data: {
        kind: "auto",
        label: `auto-${new Date().toISOString().slice(0, 19)}`,
        rowCount,
        sizeKb,
        data: data as any,
      },
    });

    const autoBackups = await prisma.systemBackup.findMany({
      where: { kind: "auto" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (autoBackups.length > retention) {
      const toPrune = autoBackups.slice(retention).map((b) => b.id);
      pruned = toPrune.length;
      await prisma.systemBackup.deleteMany({ where: { id: { in: toPrune } } });
    }

    backupResult = { created: true, rowCount };
  }

  const result: MaintenanceResult = {
    ok: dbOk,
    health: { db: dbOk, redis: redisOk },
    cleanup,
    backup: backupResult ? { created: true, rowCount: backupResult.rowCount, kept: pruned } : null,
    prunedBackups: pruned,
    timestamp: new Date().toISOString(),
  };

  await prisma.setting.update({
    where: { id: settings?.id ?? "" },
    data: {
      lastMaintenanceAt: new Date(),
      lastMaintenanceResult: result as any,
    },
  });

  logInfo("maintenance", "Auto-maintenance run completed", {
    db: dbOk,
    redis: redisOk,
    cleanup,
    backupCreated: backupResult ? true : false,
  });

  return result;
}

export { buildBackup, BACKUP_MODELS };