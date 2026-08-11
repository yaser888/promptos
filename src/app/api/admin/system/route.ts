import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const REQUIRED_ENV: Record<string, string> = {
  DATABASE_URL: "database",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "auth",
  CLERK_SECRET_KEY: "auth",
  ADMIN_ACCESS_KEY: "admin",
};

const OPTIONAL_ENV: Record<string, string> = {
  GITHUB_TOKEN: "import",
  REDIS_URL: "cache",
  STRIPE_SECRET_KEY: "payments",
  STRIPE_WEBHOOK_SECRET: "payments",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "payments",
  NEXT_PUBLIC_APP_URL: "app",
};

function maskValue(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export async function GET() {
  try {
    await requireAdmin();

    const dbOk = await prisma
      .$queryRaw`SELECT 1 as ok`
      .then(() => true)
      .catch(() => false);

    let redisOk = false;
    try {
      const res = await redis.ping();
      redisOk = res === "PONG";
    } catch {
      redisOk = false;
    }

    const envVars = Object.entries(REQUIRED_ENV).map(([name, group]) => ({
      name,
      group,
      required: true,
      set: !!process.env[name],
      value: maskValue(process.env[name], ""),
    }));
    for (const [name, group] of Object.entries(OPTIONAL_ENV)) {
      envVars.push({
        name,
        group,
        required: false,
        set: !!process.env[name],
        value: maskValue(process.env[name], ""),
      });
    }

    const modelNames = Object.keys(prisma)
      .filter((k) => k.startsWith("$") === false)
      .filter((k) =>
        ["findMany", "count", "findFirst"].some((m) => (prisma as any)[k]?.[m])
      );

    const tableCounts: Record<string, number> = {};
    for (const name of modelNames) {
      try {
        tableCounts[name] = await (prisma as any)[name].count();
      } catch {
        tableCounts[name] = -1;
      }
    }

    const settings = await prisma.setting.findFirst();

    return NextResponse.json({
      ok: true,
      health: { db: dbOk, redis: redisOk },
      envVars,
      tableCounts,
      runtime: {
        node: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        maintenanceMode: settings?.maintenanceMode ?? false,
        allowRegistration: settings?.allowRegistration ?? true,
      },
    });
  } catch (error: any) {
    console.error("Error fetching system status:", error);
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch system status" }, { status });
  }
}
