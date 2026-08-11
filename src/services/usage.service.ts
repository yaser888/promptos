import { prisma } from "@/lib/prisma";
import type { UsageAction } from "@prisma/client";

export class UsageService {
  static async track(
    clerkId: string,
    action: UsageAction,
    metadata: Record<string, unknown> = {}
  ) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return;

    return prisma.usage.create({
      data: {
        userId: user.id,
        action,
        metadata: metadata as any,
      },
    });
  }

  static async getUsageStats(clerkId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        usage: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!user) return null;

    const stats = {
      totalPrompts: user.usage.filter((u: any) => u.action === "PROMPT_CREATE").length,
      totalCopies: user.usage.filter((u: any) => u.action === "PROMPT_COPY").length,
      totalShares: user.usage.filter((u: any) => u.action === "PROMPT_SHARE").length,
      totalGenerates: user.usage.filter((u: any) => u.action === "PROMPT_GENERATE").length,
      recentActivity: user.usage.slice(0, 10),
    };

    return stats;
  }

  static async getDailyUsage(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.usage.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: today },
      },
      orderBy: { createdAt: "asc" },
    });

    const hourlyBreakdown = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
    }));

    usage.forEach((u: any) => {
      const hour = new Date(u.createdAt).getHours();
      hourlyBreakdown[hour].count++;
    });

    return hourlyBreakdown;
  }
}
