import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { progressToNext } from "@/services/gamification.service";
import { levelTitle } from "@/lib/gamification-meta";

export async function GET() {
  try {
    const settings = await prisma.setting.findUnique({ where: { id: "default" } });
    const gamSettings = (settings?.metadata as any)?.gamification ?? {};

    const session = await getServerSession();
    let user: Record<string, unknown> | null = null;
    if (session.user) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: session.user.clerkId },
        select: { id: true, name: true, xp: true, level: true, copiesCount: true, favoritesCount: true },
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          name: dbUser.name,
          xp: dbUser.xp,
          level: dbUser.level,
          copiesCount: dbUser.copiesCount,
          favoritesCount: dbUser.favoritesCount,
          title: levelTitle(dbUser.level),
          progress: progressToNext(dbUser.xp),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      user,
      settings: {
        showXpChip: gamSettings.showXpChip !== false,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
}
