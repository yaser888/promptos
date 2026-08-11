import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMaintenance } from "@/services/maintenance.service";
import { logWarn, logInfo } from "@/lib/logger";

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const secret =
    process.env.CRON_SECRET || process.env.ADMIN_ACCESS_KEY || "";
  return secret !== "" && token === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.setting.findFirst();

    if (!settings?.autoMaintenanceEnabled) {
      return NextResponse.json({ ran: false, reason: "disabled" });
    }

    // Only run the heavy maintenance once per day at the configured hour
    const utcHour = new Date().getUTCHours();
    const targetHour = (settings?.autoMaintenanceHour ?? 4) % 24;

    if (utcHour !== targetHour) {
      return NextResponse.json({ ran: false, reason: "not_due" });
    }

    const result = await runMaintenance();
    logInfo("maintenance-cron", "Maintenance cron completed", result as unknown as Record<string, unknown>);

    return NextResponse.json({ ran: true, result });
  } catch (error: any) {
    logWarn("maintenance-cron", "Maintenance cron failed", { error: String(error) });
    return NextResponse.json({ ran: false, reason: "error" }, { status: 500 });
  }
}