import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { PromptService } from "@/services/prompt.service";
import { UsageService } from "@/services/usage.service";
import { prisma } from "@/lib/prisma";
import { awardXp, XP_RULES } from "@/services/gamification.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prompt = await PromptService.getPromptById(id);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const session = await getServerSession();
    let canEdit = false;
    if (session.user) {
      const user = await prisma.user.findUnique({
        where: { clerkId: session.user.clerkId },
        select: { id: true, role: true },
      });
      canEdit = Boolean(user && (prompt.userId === user.id || user.role === "ADMIN"));
    }

    return NextResponse.json({ ...prompt, canEdit });
  } catch (error) {
    console.error("Error fetching prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    const user = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prompt = await PromptService.updatePrompt(id, data, user.id);
    return NextResponse.json(prompt);
  } catch (error) {
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await PromptService.deletePrompt(id, user.id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, changelog, value, collectionId, saved } = await req.json();
    const body = { changelog, value, collectionId, saved };

    const session = await getServerSession();

    switch (action) {
      case "copy":
        await PromptService.recordCopy(id);
        if (session.user) {
          await UsageService.track(session.user.clerkId, "PROMPT_COPY", {
            promptId: id,
          });
          const prompt = await prisma.prompt.findUnique({
            where: { id },
            select: { title: true },
          });
          awardXp(session.user.clerkId, XP_RULES.promptCopy, "prompt.copy", {
            promptId: id,
            promptTitle: prompt?.title ?? undefined,
            activityType: "prompt.copied",
          }).catch(() => {});
          await prisma.user.update({
            where: { clerkId: session.user.clerkId },
            data: { copiesCount: { increment: 1 } },
          }).catch(() => {});
        }
        return NextResponse.json({ copied: true });

      case "share":
        await PromptService.recordShare(id);
        if (session.user) {
          await UsageService.track(session.user.clerkId, "PROMPT_SHARE", {
            promptId: id,
          });
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const alreadyShared = await prisma.activity
            .findFirst({
              where: {
                type: "prompt.shared",
                userId: session.user.id,
                createdAt: { gte: todayStart },
              },
            })
            .catch(() => null);
          if (!alreadyShared) {
            const sharePrompt = await prisma.prompt.findUnique({
              where: { id },
              select: { title: true },
            });
            awardXp(session.user.clerkId, XP_RULES.share, "prompt.share", {
              promptId: id,
              promptTitle: sharePrompt?.title ?? undefined,
              activityType: "prompt.shared",
            }).catch(() => {});
          }
        }
        return NextResponse.json({ shared: true });

      case "favorite":
      case "toggle-favorite":
        if (!session.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const favUser = await prisma.user.findUnique({
          where: { clerkId: session.user.clerkId },
        });
        if (!favUser) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        const result = await PromptService.toggleFavorite(id, favUser.id);
        if (result.favorited) {
          await UsageService.track(session.user.clerkId, "FAVORITE_ADD", {
            promptId: id,
          });
          await prisma.user.update({
            where: { id: favUser.id },
            data: { favoritesCount: { increment: 1 } },
          }).catch(() => {});
          const favPrompt = await prisma.prompt.findUnique({
            where: { id },
            select: { title: true },
          });
          awardXp(session.user.clerkId, XP_RULES.favorite, "prompt.favorite", {
            promptId: id,
            promptTitle: favPrompt?.title ?? undefined,
            activityType: "prompt.favorited",
          }).catch(() => {});
        } else {
          await UsageService.track(session.user.clerkId, "FAVORITE_REMOVE", {
            promptId: id,
          });
        }
        return NextResponse.json(result);

      case "duplicate":
        if (!session.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const dupUser = await prisma.user.findUnique({
          where: { clerkId: session.user.clerkId },
        });
        if (!dupUser) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        const duplicate = await PromptService.duplicatePrompt(id, dupUser.id);
        return NextResponse.json({ prompt: duplicate });

      case "rate":
        if (!session.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const rateUser = await prisma.user.findUnique({
          where: { clerkId: session.user.clerkId },
        });
        if (!rateUser) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        const { value } = body;
        try {
          const rated = await PromptService.ratePrompt(
            id,
            rateUser.id,
            Number(value)
          );
          return NextResponse.json({ prompt: rated });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to rate";
          const status =
            message === "Already rated" ? 409 : 400;
          return NextResponse.json({ error: message }, { status });
        }

      case "save-to-collection":
        if (!session.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const colUser = await prisma.user.findUnique({
          where: { clerkId: session.user.clerkId },
        });
        if (!colUser) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        const collectionResult = await PromptService.saveToCollection(
          id,
          body.collectionId,
          colUser.id,
          Boolean(body.saved)
        );
        return NextResponse.json(collectionResult);

      case "save-version":
        if (!session.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const verUser = await prisma.user.findUnique({
          where: { clerkId: session.user.clerkId },
        });
        if (!verUser) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        const prompt = await prisma.prompt.findUnique({ where: { id } });
        if (!prompt || prompt.userId !== verUser.id) {
          return NextResponse.json(
            { error: "Unauthorized or not found" },
            { status: 404 }
          );
        }
        const version = await prisma.promptVersion.create({
          data: {
            promptId: id,
            content: prompt.content,
            version: prompt.version,
            changelog: changelog || `Snapshot v${prompt.version}`,
          },
        });
        return NextResponse.json({ version });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing prompt action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
