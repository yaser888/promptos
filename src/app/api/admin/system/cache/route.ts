import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { redis } from "@/lib/redis";
import { revalidatePath } from "next/cache";
import { logInfo } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: "redis" | "next" | "all" };

    const results: Record<string, string> = {};

    if (action === "redis" || action === "all") {
      try {
        const flushed = await redis.flushdb();
        results.redis = flushed === "OK" ? "ok" : "ok";
      } catch (err: any) {
        results.redis = `error: ${err?.message || "unreachable"}`;
      }
    }

    if (action === "next" || action === "all") {
      try {
        const paths = [
          "/",
          "/pricing",
          "/marketplace",
          "/library",
          "/blog",
        ];
        for (const p of paths) {
          try {
            revalidatePath(p, "page");
          } catch {
            // path may not exist; ignore
          }
        }
        revalidatePath("/", "layout");
        results.next = "ok";
      } catch (err: any) {
        results.next = `error: ${err?.message || "failed"}`;
      }
    }

    if (results.next === "ok" || results.redis === "ok") {
      await logInfo("system/cache", `Cache cleared (${action})`, { action, results });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    console.error("Cache clear error:", error);
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to clear cache" }, { status });
  }
}
