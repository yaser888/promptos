import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 500);
    const level = url.searchParams.get("level") || undefined;

    let logs: any[];
    try {
      logs = await prisma.systemLog.findMany({
        where: level ? { level } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch {
      logs = [];
    }

    return NextResponse.json({ ok: true, logs });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch logs" }, { status });
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    try {
      const deleted = await prisma.systemLog.deleteMany({});
      await logInfo("system/logs", `Cleared ${deleted.count} log entries`);
      return NextResponse.json({ ok: true, deleted: deleted.count });
    } catch {
      return NextResponse.json({ ok: true, deleted: 0 });
    }
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to clear logs" }, { status });
  }
}
