import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { buildBackup } from "@/services/maintenance.service";
import { logInfo } from "@/lib/logger";

export async function GET() {
  try {
    await requireAdmin();
    const backups = await prisma.systemBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        kind: true,
        label: true,
        rowCount: true,
        sizeKb: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ backups });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to load backups" }, { status });
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const { data, rowCount } = await buildBackup();
    const sizeKb = Math.round(JSON.stringify(data).length / 1024);
    const backup = await prisma.systemBackup.create({
      data: {
        kind: "manual",
        label: `manual-${new Date().toISOString().slice(0, 19)}`,
        rowCount,
        sizeKb,
        data: data as any,
      },
    });
    await logInfo("system/backup", "Manual backup created in database", { rowCount, sizeKb });
    return NextResponse.json({ ok: true, backup: { id: backup.id, kind: backup.kind, label: backup.label, rowCount, sizeKb, createdAt: backup.createdAt } });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Backup failed" }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "Missing backup id" }, { status: 400 });
    await prisma.systemBackup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Delete failed" }, { status });
  }
}