import { prisma } from "@/lib/prisma";
import { UsageService } from "@/services/usage.service";

export class MarketplaceService {
  static async getListings(params: {
    search?: string;
    platform?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) {
    const {
      search,
      platform,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 12,
    } = params;

    const where: Record<string, unknown> = {
      isDeleted: false,
      isPublic: true,
      price: { gt: 0 },
      ...(platform && { platform: platform as string }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(where.price as object),
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: {
          category: true,
          user: { select: { name: true, avatar: true } },
          _count: { select: { favorites: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.prompt.count({ where }),
    ]);

    return {
      data: data.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        platform: p.platform,
        category: p.category?.name,
        categoryId: p.categoryId,
        author: p.user?.name || "Anonymous",
        rating: 4.5,
        reviews: 0,
        downloads: p.copyCount,
        price: Number(p.price) || 0,
        tags: p.tags,
        badge: p.isFeatured ? "Featured" : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  static async getListingById(id: string) {
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        category: true,
        user: { select: { name: true, avatar: true } },
        _count: { select: { favorites: true } },
      },
    });

    if (!prompt || Number(prompt.price) <= 0) return null;

    return {
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      platform: prompt.platform,
      category: prompt.category?.name,
      author: prompt.user?.name || "Anonymous",
      price: Number(prompt.price),
      tags: prompt.tags,
      downloads: prompt.copyCount,
      createdAt: prompt.createdAt,
    };
  }

  static async purchase(listingId: string, clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      throw new Error("User not found");
    }

    const prompt = await prisma.prompt.findUnique({ where: { id: listingId } });
    if (!prompt || Number(prompt.price) <= 0) {
      throw new Error("Listing not found");
    }

    if (prompt.userId === user.id) {
      throw new Error("You cannot purchase your own listing");
    }

    const existingPurchase = await prisma.usage.findFirst({
      where: {
        userId: user.id,
        action: "MARKETPLACE_PURCHASE",
        metadata: { path: ["promptId"], equals: listingId } as any,
      },
    });

    if (!existingPurchase) {
      await UsageService.track(clerkId, "MARKETPLACE_PURCHASE", {
        promptId: listingId,
        title: prompt.title,
        price: Number(prompt.price),
      });
      await prisma.prompt.update({
        where: { id: listingId },
        data: { copyCount: { increment: 1 } },
      });
    }

    return {
      purchased: true,
      content: prompt.content,
      title: prompt.title,
    };
  }

  static async hasPurchased(clerkId: string, listingId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return false;

    const purchase = await prisma.usage.findFirst({
      where: {
        userId: user.id,
        action: "MARKETPLACE_PURCHASE",
        metadata: { path: ["promptId"], equals: listingId } as any,
      },
    });

    return !!purchase;
  }
}
