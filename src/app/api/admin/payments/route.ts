import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { planMonthlyPrice } from "@/lib/stripe";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const baseWhere: any = {
      plan: { not: "FREE" },
      status: { in: ["ACTIVE", "TRIALING"] },
    };

    if (search) {
      baseWhere.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [subscriptions, totalCount, allSubs] = await Promise.all([
      prisma.subscription.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.subscription.count({ where: baseWhere }),
      prisma.subscription.findMany({
        where: baseWhere,
        select: { plan: true, createdAt: true },
      }),
    ]);

    // Map subscriptions to payment rows with real plan pricing
    const payments = subscriptions.map((s) => ({
      id: s.id,
      userId: s.user?.id,
      customerName: s.user?.name || "Unknown",
      customerEmail: s.user?.email || "",
      plan: s.plan,
      amount: planMonthlyPrice(s.plan),
      status: s.status,
      createdAt: s.createdAt,
      currentPeriodEnd: s.currentPeriodEnd,
    }));

    const timelineMap: Record<string, { count: number; revenue: number }> = {};
    for (const s of allSubs) {
      const date = s.createdAt.toISOString().split("T")[0];
      if (!timelineMap[date]) timelineMap[date] = { count: 0, revenue: 0 };
      timelineMap[date].count += 1;
      timelineMap[date].revenue += planMonthlyPrice(s.plan);
    }

    const totalRevenue = allSubs.reduce(
      (sum, s) => sum + planMonthlyPrice(s.plan),
      0
    );

    return NextResponse.json({
      payments,
      totalRevenue,
      totalCount,
      revenueTimeline: timelineMap,
    });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch payments";
    return NextResponse.json({ error: message }, { status });
  }
}
