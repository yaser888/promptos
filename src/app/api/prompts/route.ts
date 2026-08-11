import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { PromptService } from "@/services/prompt.service";
import { runSemanticSearch } from "@/services/semantic-search";
import { UsageService } from "@/services/usage.service";
import { emitExtensionEvent } from "@/engine/extensions/runtime";
import { awardXp, XP_RULES } from "@/services/gamification.service";

const ALLOWED_SORTS = new Set([
  "createdAt",
  "updatedAt",
  "title",
  "viewCount",
  "copyCount",
  "likeCount",
  "shareCount",
  "rating",
  "score",
  "price",
  "trending",
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession();

    const rawSort = searchParams.get("sortBy") || "createdAt";
    const sortBy = ALLOWED_SORTS.has(rawSort) ? rawSort : "createdAt";
    const favorites = searchParams.get("favorites") === "true";
    const myOnly = searchParams.get("myOnly") === "true";

    let dbUser = null;
    if (session.user) {
      dbUser = await prisma.user.findUnique({
        where: { clerkId: session.user.clerkId },
      });
    }

    if ((myOnly || favorites) && !dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tagsRaw = searchParams.get("tags") || searchParams.get("tag");
    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    let search = searchParams.get("search") || undefined;
    let semanticIds: string[] | undefined;
    if (search && searchParams.get("semantic") === "true") {
      const ids = await runSemanticSearch(search, { limit: 50 });
      if (ids) {
        semanticIds = ids;
        search = undefined;
      }
    }

    const params = {
      userId: searchParams.get("userId") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      platform: searchParams.get("platform") || undefined,
      search,
      tags,
      ids: semanticIds,
      collectionId: searchParams.get("collectionId") || undefined,
      sortBy,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
      favoritedBy: dbUser?.id,
    };

    if (myOnly || favorites) {
      if (favorites) {
        const result = await PromptService.getFavoritePrompts(dbUser!.id, {
          ...params,
        });
        return NextResponse.json(result);
      }
      const result = await PromptService.getPrompts({
        ...params,
        userId: dbUser!.id,
        isPublic: false,
      });
      return NextResponse.json(result);
    }

    const result = await PromptService.getPrompts({
      ...params,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const user = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prompt = await PromptService.createPrompt({
      ...data,
      userId: user.id,
    });

    await UsageService.track(session.user.clerkId, "PROMPT_CREATE", {
      promptId: prompt.id,
      title: prompt.title,
    });

    emitExtensionEvent("prompt.created", {
      id: prompt.id,
      title: prompt.title,
      author: user.name,
      isPublic: (prompt as any).isPublic ?? true,
    }).catch(() => {});

    awardXp(session.user.clerkId, XP_RULES.promptCreate, "prompt.create", {
      promptId: prompt.id,
      promptTitle: prompt.title,
      activityType: "prompt.created",
    }).catch(() => {});

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error("Error creating prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}
