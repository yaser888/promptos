import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SORT_ORDERS: Record<string, Prisma.PromptOrderByWithRelationInput[]> = {
  createdAt: [{ createdAt: "desc" }],
  updatedAt: [{ updatedAt: "desc" }],
  title: [{ title: "asc" }],
  viewCount: [{ viewCount: "desc" }],
  copyCount: [{ copyCount: "desc" }],
  likeCount: [{ likeCount: "desc" }],
  shareCount: [{ shareCount: "desc" }],
  rating: [{ rating: "desc" }, { ratingCount: "desc" }],
  score: [{ score: "desc" }, { createdAt: "desc" }],
  trending: [{ score: "desc" }, { createdAt: "desc" }],
};

const KEYSET_SORTS = new Set(["createdAt", "updatedAt"]);

export interface ListPromptsParams {
  userId?: string;
  categoryId?: string;
  platform?: string;
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  favoritedBy?: string;
  collectionId?: string;
  ids?: string[];
  page?: number;
  pageSize?: number;
  cursor?: string;
  limit?: number;
}

const DEFAULT_BASE_INCLUDE = {
  category: true,
  user: { select: { name: true, avatar: true } },
  _count: { select: { favorites: true, translations: true } },
};

export class PromptService {
  static buildWhere(
    params: ListPromptsParams
  ): Prisma.PromptWhereInput {
    const where: Prisma.PromptWhereInput = { isDeleted: false };
    if (params.isPublic) where.isPublic = true;
    if (params.userId) where.userId = params.userId;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.platform) where.platform = params.platform as never;
    if (params.tags?.length) where.tags = { hasEvery: params.tags };
    if (params.favoritedBy)
      where.favorites = { some: { userId: params.favoritedBy } };
    if (params.collectionId)
      where.collectionEntries = { some: { collectionId: params.collectionId } };
    if (params.ids?.length) where.id = { in: params.ids };
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { tags: { hasSome: [q] } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    return where;
  }

  static buildOrderBy(
    sortBy: string,
    sortOrder: "asc" | "desc"
  ): Prisma.PromptOrderByWithRelationInput[] {
    const base =
      SORT_ORDERS[sortBy] ??
      SORT_ORDERS.createdAt;
    return base.map((entry) => {
      const key = Object.keys(entry)[0] as keyof typeof entry;
      return { [key]: sortOrder === "asc" ? "asc" : "desc" } as never;
    });
  }

  private static helper(
    where: Prisma.PromptWhereInput,
    favoritedBy?: string
  ): Prisma.PromptInclude {
    return {
      ...DEFAULT_BASE_INCLUDE,
      ...(favoritedBy
        ? { favorites: { where: { userId: favoritedBy }, select: { id: true } } }
        : {}),
    } as Prisma.PromptInclude;
  }

  private static hydrateFlagged<T extends { favorites?: unknown[] }>(
    rows: T[],
    favoritedBy?: string
  ): Array<T & { favorited: boolean }> {
    if (!favoritedBy) {
      return rows.map((r) => ({ ...r, favorited: false }));
    }
    return rows.map((r) => ({
      ...r,
      favorited: Array.isArray(r.favorites) && r.favorites.length > 0,
    }));
  }

  /**
   * Trending candidates: precomputed `score` gives an indexable fast path for
   * giant tables; the recency boost is applied in-memory to a bounded window
   * (cheap, deterministic enough for a feed).
   */
  private static async trending(
    where: Prisma.PromptWhereInput,
    page: number,
    pageSize: number,
    favoritedBy?: string
  ) {
    const include = {
      ...DEFAULT_BASE_INCLUDE,
      ...(favoritedBy
        ? { favorites: { where: { userId: favoritedBy }, select: { id: true } } }
        : {}),
    };
    const end = Math.min(page * pageSize, 300);
    const rows = await prisma.prompt.findMany({
      where,
      include,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: end,
    });
    const total = await prisma.prompt.count({ where });
    const now = Date.now();
    const boosting = (p: (typeof rows)[number]) => {
      const recencyDays = Math.max(
        0,
        (now - new Date(p.createdAt).getTime()) / 86_400_000
      );
      const recencyBoost = Math.exp(-recencyDays / 14) * 40;
      return (
        p.score +
        recencyBoost
      );
    };
    const sorted = [...rows].sort((a, b) => boosting(b) - boosting(a));
    const start = (page - 1) * pageSize;
    const slice = sorted.slice(start, start + pageSize);
    return {
      data: this.hydrateFlagged(slice, favoritedBy),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      cursor: null,
      hasMore: slice.length === pageSize && start + pageSize < total,
    };
  }

  static async list(params: ListPromptsParams) {
    const {
      page = 1,
      pageSize = 20,
      cursor,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      favoritedBy,
    } = params;

    const where = this.buildWhere(params);
    const include = this.helper(where, favoritedBy);

    const isKeyset =
      KEYSET_SORTS.has(sortBy) && (Boolean(cursor) || limit !== undefined);

    if (sortBy === "trending" && !isKeyset) {
      return this.trending(where, page, pageSize, favoritedBy);
    }

    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    if (isKeyset) {
      const take = Math.min(limit ?? pageSize, 100);
      const sortField = sortBy === "createdAt" ? "createdAt" : "updatedAt";
      const rows = await prisma.prompt.findMany({
        where,
        include,
        orderBy: [{ [sortField]: sortOrder }, { id: sortOrder }] as never,
        cursor: cursor ? ({ id: cursor } as never) : undefined,
        take,
        skip: cursor ? 1 : 0,
      });
      const total = await prisma.prompt.count({ where });
      const lastId = rows.length > 0 ? rows[rows.length - 1].id : null;
      return {
        data: this.hydrateFlagged(rows, favoritedBy),
        total,
        page,
        pageSize,
        cursor: lastId,
        hasMore: rows.length === take,
      };
    }

    const [data, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.prompt.count({ where }),
    ]);

    return {
      data: this.hydrateFlagged(data, favoritedBy),
      total,
      page,
      pageSize,
      cursor: null,
      hasMore: false,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  static async getFavoritePrompts(
    userId: string,
    params: Omit<ListPromptsParams, "favoritedBy" | "isPublic">
  ) {
    return this.list({ ...params, favoritedBy: userId, isPublic: true });
  }

  static async getPromptById(id: string) {
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        category: true,
        user: { select: { name: true, avatar: true } },
        versions: { orderBy: { version: "desc" }, take: 10 },
        translations: true,
        _count: { select: { favorites: true } },
      },
    });

    if (prompt) {
      await prisma.prompt.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return prompt;
  }

  static async createPrompt(data: {
    title: string;
    content: string;
    description?: string;
    platform?: string;
    tone?: string;
    language?: string;
    complexity?: string;
    length?: string;
    outputFormat?: string;
    tags?: string[];
    categoryId?: string;
    userId: string;
    isPublic?: boolean;
  }) {
    return prisma.prompt.create({
      data: {
        title: data.title,
        content: data.content,
        description: data.description || null,
        platform: (data.platform as never) || "GENERIC",
        tone: (data.tone as never) || "PROFESSIONAL",
        language: data.language || "en",
        complexity: (data.complexity as never) || "INTERMEDIATE",
        length: (data.length as never) || "MEDIUM",
        outputFormat: (data.outputFormat as never) || "MARKDOWN",
        tags: data.tags || [],
        categoryId: data.categoryId || null,
        userId: data.userId,
        isPublic: data.isPublic ?? true,
      },
    });
  }

  static async updatePrompt(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      description: string;
      platform: string;
      tone: string;
      language: string;
      complexity: string;
      length: string;
      outputFormat: string;
      tags: string[];
      categoryId: string;
      isPublic: boolean;
      changelog: string;
    }>,
    userId: string
  ) {
    const existing = await prisma.prompt.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new Error("Unauthorized or not found");
    }

    const newVersion = existing.version + 1;

    await prisma.promptVersion.create({
      data: {
        promptId: id,
        content: existing.content,
        version: existing.version,
        changelog: data.changelog || `Updated to version ${newVersion}`,
      },
    });

    return prisma.prompt.update({
      where: { id },
      data: {
        ...data,
        version: newVersion,
      } as never,
    });
  }

  static async deletePrompt(id: string, userId: string) {
    const prompt = await prisma.prompt.findUnique({ where: { id } });
    if (!prompt || (prompt.userId !== userId && userId !== "admin")) {
      throw new Error("Unauthorized or not found");
    }

    return prisma.prompt.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  private static scoreOf(p: {
    likeCount: number;
    copyCount: number;
    shareCount: number;
    viewCount: number;
  }) {
    return Math.round(
      p.likeCount * 3 + p.copyCount * 2 + p.shareCount * 4 + p.viewCount * 0.2
    );
  }

  static async toggleFavorite(promptId: string, userId: string) {
    const existing = await prisma.favorite.findUnique({
      where: { userId_promptId: { userId, promptId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      const p = await prisma.prompt.findUnique({
        where: { id: promptId },
        select: {
          likeCount: true,
          copyCount: true,
          shareCount: true,
          viewCount: true,
        },
      });
      if (p) {
        const likeCount = Math.max(0, p.likeCount - 1);
        await prisma.prompt.update({
          where: { id: promptId },
          data: {
            likeCount,
            score: this.scoreOf({ ...p, likeCount }),
          },
        });
      }
      return { favorited: false };
    }

    await prisma.favorite.create({
      data: { userId, promptId },
    });

    const before = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: {
        likeCount: true,
        copyCount: true,
        shareCount: true,
        viewCount: true,
      },
    });
    const likeCount = (before?.likeCount ?? 0) + 1;
    await prisma.prompt.update({
      where: { id: promptId },
      data: {
        likeCount,
        score: this.scoreOf({
          likeCount,
          copyCount: before?.copyCount ?? 0,
          shareCount: before?.shareCount ?? 0,
          viewCount: before?.viewCount ?? 0,
        }),
      },
    });

    return { favorited: true };
  }

  static async recordCopy(promptId: string) {
    const before = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: {
        likeCount: true,
        copyCount: true,
        shareCount: true,
        viewCount: true,
      },
    });
    if (!before) return null;
    const copyCount = before.copyCount + 1;
    return prisma.prompt.update({
      where: { id: promptId },
      data: {
        copyCount,
        score: this.scoreOf({ ...before, copyCount }),
      },
    });
  }

  static async recordShare(promptId: string) {
    const before = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: {
        likeCount: true,
        copyCount: true,
        shareCount: true,
        viewCount: true,
      },
    });
    if (!before) return null;
    const shareCount = before.shareCount + 1;
    return prisma.prompt.update({
      where: { id: promptId },
      data: {
        shareCount,
        score: this.scoreOf({ ...before, shareCount }),
      },
    });
  }

  static async ratePrompt(promptId: string, userId: string, value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }
    const existing = await prisma.activity.findFirst({
      where: { type: "prompt.rated", userId, metadata: { path: ["promptId"], equals: promptId } },
    });
    if (existing) {
      throw new Error("Already rated");
    }

    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: { ratingSum: true, ratingCount: true, title: true },
    });
    if (!prompt) throw new Error("Prompt not found");

    const ratingSum = prompt.ratingSum + value;
    const ratingCount = prompt.ratingCount + 1;

    await prisma.activity.create({
      data: {
        type: "prompt.rated",
        userId,
        userName: "rating",
        promptId,
        promptTitle: prompt.title ?? "",
        metadata: { promptId },
      },
    });

    return prisma.prompt.update({
      where: { id: promptId },
      data: {
        ratingSum,
        ratingCount,
        rating: ratingSum / ratingCount,
      },
    });
  }

  static async duplicatePrompt(promptId: string, userId: string) {
    const source = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!source || source.isDeleted) throw new Error("Prompt not found");

    const MAX_TITLE = 150;
    const suffix = " (copy)";
    const title =
      source.title.length + suffix.length <= MAX_TITLE
        ? `${source.title}${suffix}`
        : `${source.title.slice(0, MAX_TITLE - suffix.length)}${suffix}`;

    return prisma.prompt.create({
      data: {
        title,
        content: source.content,
        description: source.description,
        platform: source.platform,
        tone: source.tone,
        language: source.language,
        complexity: source.complexity,
        length: source.length,
        outputFormat: source.outputFormat,
        tags: source.tags,
        categoryId: source.categoryId,
        userId,
        isPublic: source.isPublic,
        isFeatured: false,
      },
    });
  }

  static async listTags(limit = 100) {
    const rows = await prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest("tags") AS tag
      FROM "Prompt"
      WHERE NOT "isDeleted"
      ORDER BY tag
      LIMIT ${limit}
    `;
    return rows.map((r) => r.tag);
  }

  static async getPrompts(params: ListPromptsParams) {
    return this.list(params);
  }

  static async saveToCollection(
    promptId: string,
    collectionId: string,
    userId: string,
    saved: boolean
  ) {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection || collection.userId !== userId) {
      throw new Error("Unauthorized or not found");
    }
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new Error("Prompt not found");

    const entry = await prisma.collectionPrompt.findUnique({
      where: {
        collectionId_promptId: { collectionId, promptId },
      },
    });

    if (saved && !entry) {
      await prisma.collectionPrompt.create({
        data: { collectionId, promptId },
      });
    }
    if (!saved && entry) {
      await prisma.collectionPrompt.delete({ where: { id: entry.id } });
    }
    return { saved };
  }

  static async listCollections(userId: string, promptId?: string) {
    const collections = await prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { entries: true } },
        ...(promptId
          ? { entries: { where: { promptId }, select: { id: true } } }
          : {}),
      },
    });
    return promptId
      ? collections.map((c) => ({
          ...c,
          containsPrompt: c.entries.length > 0,
          promptCount: c._count.entries,
        }))
      : collections.map((c) => ({
          ...c,
          promptCount: c._count.entries,
        }));
  }

  static async createCollection(
    userId: string,
    data: { name: string; description?: string; isPrivate?: boolean }
  ) {
    const name = data.name?.trim();
    if (!name) throw new Error("Name is required");
    return prisma.collection.create({
      data: {
        name,
        description: data.description?.trim() || null,
        isPrivate: data.isPrivate ?? false,
        userId,
      },
    });
  }

  static async deleteCollection(id: string, userId: string) {
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new Error("Collection not found");
    if (collection.userId !== userId) throw new Error("Unauthorized");
    await prisma.collection.delete({ where: { id } });
    return { deleted: true };
  }
}