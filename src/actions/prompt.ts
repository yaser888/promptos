"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PromptService } from "@/services/prompt.service";
import { UsageService } from "@/services/usage.service";

export async function createPrompt(data: {
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
  isPublic?: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const prompt = await PromptService.createPrompt({
    ...data,
    userId: user.id,
  });

  await UsageService.track(userId, "PROMPT_CREATE", {
    promptId: prompt.id,
  });

  return prompt;
}

export async function updatePrompt(
  id: string,
  data: {
    title?: string;
    content?: string;
    description?: string;
    platform?: string;
    tone?: string;
    language?: string;
    complexity?: string;
    length?: string;
    outputFormat?: string;
    tags?: string[];
    categoryId?: string;
    isPublic?: boolean;
    changelog?: string;
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  return PromptService.updatePrompt(id, data, user.id);
}

export async function deletePrompt(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  return PromptService.deletePrompt(id, user.id);
}

export async function toggleFavorite(promptId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const result = await PromptService.toggleFavorite(promptId, user.id);

  await UsageService.track(
    userId,
    result.favorited ? "FAVORITE_ADD" : "FAVORITE_REMOVE",
    { promptId }
  );

  return result;
}

export async function getPrompts(params: {
  search?: string;
  categoryId?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return PromptService.getPrompts(params);
}

export async function getMyPrompts(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  return PromptService.getPrompts({
    ...params,
    userId: user.id,
    isPublic: false,
  });
}

export async function getFavorites() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return [];

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      prompt: {
        include: {
          category: true,
          user: { select: { name: true, avatar: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites.map((f: any) => f.prompt);
}

export async function recordCopy(promptId: string) {
  const { userId } = await auth();
  if (!userId) return;

  await PromptService.recordCopy(promptId);

  await UsageService.track(userId, "PROMPT_COPY", { promptId });
}
