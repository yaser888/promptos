import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { runMaintenance } from "@/services/maintenance.service";

const AUTOMATION_FIELDS = [
  "marketplaceEnabled",
  "generatorEnabled",
  "blogEnabled",
  "autoBackupEnabled",
  "autoBackupRetention",
  "autoCleanupEnabled",
  "autoMaintenanceEnabled",
  "autoMaintenanceHour",
] as const;

export async function GET() {
  try {
    await requireAdmin();
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({ data: {} });
    }

    const backups = await prisma.systemBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        label: true,
        rowCount: true,
        sizeKb: true,
        createdAt: true,
      },
    });

    const lastMaintenance = (settings as any).lastMaintenanceResult as Record<string, any> | null;

    const field = (name: string) => (settings as any)[name];
    return NextResponse.json({
      ok: true,
      settings: {
        marketplaceEnabled: field("marketplaceEnabled") ?? true,
        generatorEnabled: field("generatorEnabled") ?? true,
        blogEnabled: field("blogEnabled") ?? true,
        autoBackupEnabled: field("autoBackupEnabled") ?? false,
        autoBackupRetention: field("autoBackupRetention") ?? 14,
        autoCleanupEnabled: field("autoCleanupEnabled") ?? true,
        autoMaintenanceEnabled: field("autoMaintenanceEnabled") ?? true,
        autoMaintenanceHour: field("autoMaintenanceHour") ?? 4,
        lastMaintenanceAt: field("lastMaintenanceAt") ?? null,
        maintenanceMode: field("maintenanceMode") ?? false,
        allowRegistration: field("allowRegistration") ?? true,
      },
      lastMaintenanceResult: lastMaintenance,
      backups,
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to load automation settings" }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    for (const name of AUTOMATION_FIELDS) {
      if (name in body) {
        updateData[name] = body[name];
      }
    }

    if (Object.keys(updateData).length > 0) {
      const existing = await prisma.setting.findFirst();
      if (existing) {
        await prisma.setting.update({ where: { id: existing.id }, data: updateData });
      } else {
        await prisma.setting.create({ data: updateData });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to save automation settings" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { action } = body as { action: string };

    if (action !== "run") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const result = await runMaintenance();
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Maintenance run failed" }, { status });
  }
}