import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { planMonthlyPrice } from "@/lib/stripe";

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL = 30_000;

let statsCache: { at: number; payload: unknown } | null = null;

export async function GET() {
  try {
    await requireAdmin();

    const now = Date.now();
    if (statsCache && now - statsCache.at < CACHE_TTL) {
      return NextResponse.json(statsCache.payload);
    }

    const weekAgo = new Date(now - 7 * DAY_MS);

    const [counts, weeklyRows, recentUsers, paidSubscriptions, planBreakdown] =
      await Promise.all([
        prisma.$queryRaw<
          {
            total_users: number;
            total_prompts: number;
            total_copies: number;
            active_subs: number;
            prompts_week: number;
            users_week: number;
          }[]
        >`
          SELECT
            (SELECT count(*)::int FROM "User") AS total_users,
            (SELECT count(*)::int FROM "Prompt" WHERE "isDeleted" = false) AS total_prompts,
            (SELECT coalesce(sum("copyCount"), 0)::int FROM "Prompt") AS total_copies,
            (SELECT count(*)::int FROM "Subscription" WHERE "status" IN ('ACTIVE','TRIALING')) AS active_subs,
            (SELECT count(*)::int FROM "Prompt" WHERE "createdAt" >= ${weekAgo}) AS prompts_week,
            (SELECT count(*)::int FROM "User" WHERE "createdAt" >= ${weekAgo}) AS users_week
        `,
        prisma.$queryRaw<{ day: string; n: number }[]>`
          SELECT to_char("createdAt", 'YYYY-MM-DD') AS day, count(*)::int AS n
          FROM "Prompt"
          WHERE "createdAt" >= ${weekAgo}
          GROUP BY 1
        `,
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            name: true,
            email: true,
            createdAt: true,
            role: true,
            subscription: { select: { plan: true, status: true } },
          },
        }),
        prisma.subscription.findMany({
          where: { plan: { not: "FREE" }, status: { in: ["ACTIVE", "TRIALING"] } },
          select: { plan: true, currentPeriodStart: true },
        }),
        prisma.subscription.groupBy({
          by: ["plan"],
          where: { status: "ACTIVE" },
          _count: true,
        }),
      ]);

    const row = counts[0];

    const byDay = new Map<string, number>(weeklyRows.map((r) => [r.day, r.n]));
    const labels: string[] = [];
    const countsArr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
      countsArr.push(byDay.get(key) ?? 0);
    }
    const weeklyActivity = { labels, counts: countsArr };

    const estimatedRevenue = paidSubscriptions.reduce(
      (sum, sub) => sum + planMonthlyPrice(sub.plan),
      0
    );

    const timeline = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      const dayRows = paidSubscriptions.filter(
        (s) => s.currentPeriodStart.toISOString().slice(0, 10) === key
      );
      return {
        date: key,
        amount: dayRows.reduce((sum, s) => sum + planMonthlyPrice(s.plan), 0),
        count: dayRows.length,
      };
    });

    const payload = {
      totalUsers: row.total_users,
      totalPrompts: row.total_prompts,
      totalCopies: row.total_copies,
      activeSubscriptions: row.active_subs,
      estimatedRevenue,
      promptsLastWeek: row.prompts_week,
      usersLastWeek: row.users_week,
      recentUsers,
      planBreakdown,
      weeklyActivity,
      revenueTimeline: timeline,
      todayPrompts: byDay.get(new Date(now).toISOString().slice(0, 10)) ?? 0,
      todayUsers: recentUsers.filter(
        (u) => u.createdAt.toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10)
      ).length,
    };

    statsCache = { at: now, payload };
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    const status = error?.status || 500;
    const message =
      status === 401 || status === 403
        ? error.message
        : "Failed to fetch admin stats";
    return NextResponse.json({ error: message }, { status });
  }
}
