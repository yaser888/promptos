import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { logInfo, logError } from "@/lib/logger";

const MODELS = [
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
  "systemLog",
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

export async function GET() {
  try {
    await requireAdmin();

    const dump: Record<string, any[]> = {};
    for (const model of MODELS) {
      try {
        const rows = await (prisma as any)[model].findMany();
        dump[model] = rows.map(serialize);
      } catch {
        dump[model] = [];
      }
    }

    await logInfo("system/backup", `Backup created with ${Object.values(dump).reduce((n, r) => n + r.length, 0)} rows`);

    const fileName = `promptos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(dump, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to create backup" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { data, wipe } = body as { data: Record<string, any[]>; wipe?: boolean };

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid backup payload" }, { status: 400 });
    }

    const summary: Record<string, number> = {};
    let restored = 0;
    let skipped = 0;

    if (wipe) {
      for (const model of [...MODELS].reverse()) {
        try {
          await (prisma as any)[model].deleteMany({});
        } catch {
          // skip models with FK constraints that cannot be cleared first
        }
      }
    }

    const order = ["setting", "category", "tag", "plan", "source", "user"];
    const sorted = [...order, ...MODELS.filter((m) => !order.includes(m))];

    for (const model of sorted) {
      const rows = data[model];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row || typeof row.id !== "string") continue;
        try {
          const { id, ...rest } = row;
          const existing = await (prisma as any)[model].findUnique({ where: { id } });
          if (existing) {
            skipped++;
          } else {
            await (prisma as any)[model].create({ data: { id, ...rest } });
            restored++;
          }
        } catch {
          skipped++;
        }
      }
      summary[model] = rows.length;
    }

    await logInfo("system/restore", `Restore finished: ${restored} created, ${skipped} skipped`, {
      wipe: !!wipe,
      summary,
    });

    return NextResponse.json({ ok: true, restored, skipped, summary });
  } catch (error: any) {
    console.error("Restore error:", error);
    await logError("system/restore", `Restore failed: ${error?.message || "unknown"}`);
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to restore backup" }, { status });
  }
}
