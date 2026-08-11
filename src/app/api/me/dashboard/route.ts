import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [totalPrompts, totalViews, totalCopies, favorites, usage, popular] =
      await Promise.all([
        prisma.prompt.count({
          where: { userId: dbUser.id, isDeleted: false },
        }),
        prisma.prompt.aggregate({
          where: { userId: dbUser.id, isDeleted: false },
          _sum: { viewCount: true },
        }),
        prisma.prompt.aggregate({
          where: { userId: dbUser.id, isDeleted: false },
          _sum: { copyCount: true },
        }),
        prisma.favorite.count({ where: { userId: dbUser.id } }),
        prisma.usage.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { action: true, metadata: true, createdAt: true },
        }),
        prisma.prompt.findMany({
          where: { isPublic: true, isDeleted: false },
          orderBy: { viewCount: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            viewCount: true,
            copyCount: true,
          },
        }),
      ]);

    const activityLabels: Record<string, string> = {
      PROMPT_CREATE: "Created prompt",
      PROMPT_COPY: "Copied prompt",
      PROMPT_SHARE: "Shared prompt",
      PROMPT_GENERATE: "Generated prompt",
      PROMPT_OPTIMIZE: "Optimized prompt",
      PROMPT_ANALYZE: "Analyzed prompt",
      PROMPT_TRANSLATE: "Translated prompt",
      PROMPT_EXPORT: "Exported prompt",
      PROMPT_IMPORT: "Imported prompt",
      FAVORITE_ADD: "Added to favorites",
      FAVORITE_REMOVE: "Removed from favorites",
      COLLECTION_CREATE: "Created collection",
    };

    const recentActivity = usage.map((u) => ({
      action: activityLabels[u.action] || u.action,
      detail:
        typeof u.metadata === "object" && u.metadata && "title" in u.metadata
          ? String((u.metadata as any).title)
          : "",
      time: u.createdAt,
    }));

    return NextResponse.json({
      stats: {
        totalPrompts,
        totalViews: totalViews._sum.viewCount || 0,
        totalCopies: totalCopies._sum.copyCount || 0,
        totalFavorites: favorites,
      },
      recentActivity,
      popularPrompts: popular.map((p, i) => ({
        rank: i + 1,
        title: p.title,
        views: p.viewCount,
        copies: p.copyCount,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
