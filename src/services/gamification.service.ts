import { prisma } from "@/lib/prisma";
import { levelTitle as sharedLevelTitle } from "@/lib/gamification-meta";

export const XP_RULES = {
  promptCreate: 25,
  promptCopy: 2,
  favorite: 5,
  share: 8,
};

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level - 1, 1.6)) + (level - 1) * 50;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 100) level++;
  return level;
}

export function levelTitle(level: number): string {
  return sharedLevelTitle(level);
}

export function progressToNext(xp: number): { current: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const needed = next - base;
  const current = xp - base;
  return { current, needed, ratio: needed > 0 ? Math.min(1, current / needed) : 1 };
}

export interface AwardResult {
  xp: number;
  level: number;
  levelUp: boolean;
  title: string;
}

async function logActivity(data: {
  type: string;
  userId?: string | null;
  userName: string;
  promptId?: string | null;
  promptTitle?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        type: data.type,
        userId: data.userId ?? null,
        userName: data.userName,
        promptId: data.promptId ?? null,
        promptTitle: data.promptTitle ?? null,
        metadata: (data.metadata ?? {}) as any,
      },
    });
  } catch {
    // feed is best-effort
  }
}

export async function awardXp(
  clerkId: string,
  amount: number,
  reason: string,
  ctx?: {
    promptId?: string;
    promptTitle?: string;
    activityType?: string;
    activityMeta?: Record<string, unknown>;
  }
): Promise<AwardResult | null> {
  try {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return null;

    const newXp = user.xp + amount;
    const newLevel = levelFromXp(newXp);
    const levelUp = newLevel > user.level;

    await prisma.user.update({
      where: { id: user.id },
      data: { xp: newXp, level: newLevel },
    });

    await logActivity({
      type: ctx?.activityType ?? "xp.gained",
      userId: user.id,
      userName: user.name,
      promptId: ctx?.promptId ?? null,
      promptTitle: ctx?.promptTitle ?? null,
      metadata: { amount, reason, xp: newXp },
    });

    return {
      xp: newXp,
      level: newLevel,
      levelUp,
      title: levelTitle(newLevel),
    };
  } catch {
    return null;
  }
}
