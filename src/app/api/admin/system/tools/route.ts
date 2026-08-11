import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";
import { auditFromRequest } from "@/core/security/audit";
import { verifyCsrf, CSRF_HEADER } from "@/core/security/csrf";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();

    const cookieHeader = req.headers.get("cookie");
    const csrfHeader = req.headers.get(CSRF_HEADER);
    if (!verifyCsrf(cookieHeader, csrfHeader)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body as { action: string };
    const results: Record<string, any> = { action };

    switch (action) {
      case "resetDailyCounters": {
        const res = await prisma.user.updateMany({ data: { dailyPromptCount: 0 } });
        results.updated = res.count;
        break;
      }
      case "purgeDeleted": {
        const res = await prisma.prompt.deleteMany({ where: { isDeleted: true } });
        results.updated = res.count;
        break;
      }
      case "fixOrphanCategories": {
        const prompts = await prisma.prompt.findMany({
          where: { categoryId: { not: null } },
          select: { id: true, categoryId: true },
        });
        const catIds = await prisma.category.findMany({ select: { id: true } });
        const catSet = new Set(catIds.map((c) => c.id));
        const orphans = prompts.filter((p) => !catSet.has(p.categoryId!));
        await prisma.$transaction(
          orphans.map((o) =>
            prisma.prompt.update({ where: { id: o.id }, data: { categoryId: null } })
          )
        );
        results.updated = orphans.length;
        break;
      }
      case "purgeDuplicatePrompts": {
        const prompts = await prisma.prompt.findMany({
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true, content: true },
        });
        const seen = new Map<string, string[]>();
        for (const p of prompts) {
          const key = `${p.title.toLowerCase().trim()}|${p.content.trim().slice(0, 500)}`;
          const arr = seen.get(key) || [];
          arr.push(p.id);
          seen.set(key, arr);
        }
        const dupIds = [...seen.values()].filter((a) => a.length > 1).map((a) => a.slice(1)).flat();
        if (dupIds.length > 0) {
          await prisma.prompt.updateMany({
            where: { id: { in: dupIds } },
            data: { isDeleted: true },
          });
        }
        results.updated = dupIds.length;
        break;
      }
      case "dbPush": {
        if (process.env.VERCEL) {
          return NextResponse.json({ error: "dbPush is only available on self-hosted servers" }, { status: 400 });
        }
        const { stdout, stderr } = await execAsync("npx prisma db push --skip-generate", {
          cwd: process.cwd(),
          timeout: 120000,
        }).catch((err: any) => ({ stdout: err?.stdout || "", stderr: err?.message || String(err) }));
        results.output = (stdout + stderr).slice(-2000);
        break;
      }
      case "resetAllViews": {
        const res = await prisma.prompt.updateMany({ data: { viewCount: 0, copyCount: 0 } });
        results.updated = res.count;
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    await logInfo("system/tools", `Tool executed: ${action}`, results);
    await auditFromRequest(req, "execute", "system/tools", action, session);
    return NextResponse.json({ ok: true, ...results });
  } catch (error: any) {
    console.error("System tool error:", error);
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Tool failed" }, { status });
  }
}
