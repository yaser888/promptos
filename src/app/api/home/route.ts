import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHomeContent } from "@/engine/home/home.service";

export async function GET() {
  try {
    const [totalPrompts, totalUsers, totalCopies, totalFavorites, featuredPrompts, topCategories, content, cmsPages] =
      await Promise.all([
        prisma.prompt.count({ where: { isDeleted: false, isPublic: true } }),
        prisma.user.count(),
        prisma.prompt.aggregate({ _sum: { copyCount: true } }),
        prisma.prompt.aggregate({ _sum: { likeCount: true } }),
        prisma.prompt.findMany({
          where: { isDeleted: false, isPublic: true, isFeatured: true },
          include: {
            category: true,
            user: { select: { name: true, avatar: true } },
          },
          orderBy: { viewCount: "desc" },
          take: 6,
        }),
        prisma.category.findMany({
          include: { _count: { select: { prompts: true } } },
          orderBy: { prompts: { _count: "desc" } },
          take: 8,
        }),
        getHomeContent(),
        prisma.page.findMany({
          where: { isPublic: true, status: "published" },
          select: { slug: true, title: true },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
      ]);

    return NextResponse.json({
      stats: {
        totalPrompts,
        totalUsers,
        totalCopies: totalCopies._sum.copyCount || 0,
        totalFavorites: totalFavorites._sum.likeCount || 0,
      },
      featuredPrompts,
      topCategories,
      content,
      pages: cmsPages,
    });
  } catch (error) {
    console.error("Error fetching home stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch home data" },
      { status: 500 }
    );
  }
}
