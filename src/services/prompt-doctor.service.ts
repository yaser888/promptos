import { prisma } from "@/lib/prisma";
import { analyzePrompt } from "@/engine/prompt-doctor/analyzer";
import { improvePrompt } from "@/engine/prompt-doctor/improver";
import { SubscriptionService } from "@/services/subscription.service";
import { UsageService } from "@/services/usage.service";

const HISTORY_FEATURE = "ai_analyzer";

export class PromptDoctorService {
  static async historyEnabled(userId: string): Promise<boolean> {
    try {
      return await SubscriptionService.checkAccess(userId, HISTORY_FEATURE);
    } catch {
      return false;
    }
  }

  static async analyze(
    input: { content: string; title?: string },
    ctx: { userId?: string; clerkId?: string } = {}
  ) {
    const content = input.content?.trim();
    if (!content) throw new Error("Content is required");

    const analysis = analyzePrompt(content);
    const title =
      input.title?.trim() ||
      content.split("\n").find((l) => l.trim())?.slice(0, 60) ||
      "Untitled prompt";

    let saved = false;
    let canSave = false;
    if (ctx.userId) {
      canSave = await this.historyEnabled(ctx.userId);
      if (canSave) {
        try {
          await prisma.promptAnalysis.create({
            data: {
              userId: ctx.userId,
              title,
              content,
              analysis: analysis as never,
            },
          });
          saved = true;
        } catch (error) {
          console.error("Error saving prompt analysis:", error);
        }
      }
    }

    if (ctx.clerkId) {
      await UsageService.track(ctx.clerkId, "PROMPT_ANALYZE", {
        promptTitle: title,
        overall: analysis.overall,
        saved,
      });
    }

    return { analysis, history: { enabled: canSave, saved } };
  }

  static async fix(content: string) {
    const trimmed = content?.trim();
    if (!trimmed) throw new Error("Content is required");
    return improvePrompt(trimmed);
  }

  static async getHistory(userId: string, limit = 20) {
    const enabled = await this.historyEnabled(userId);
    if (!enabled) return { enabled: false, items: [] };

    const rows = await prisma.promptAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        improved: true,
        createdAt: true,
        analysis: true,
      },
    });

    return {
      enabled: true,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        improved: row.improved,
        createdAt: row.createdAt,
        overall: ((row.analysis as { overall?: number })?.overall ?? 0) as number,
      })),
    };
  }

  static async saveImproved(userId: string, analysisId: string, improved: string) {
    const row = await prisma.promptAnalysis.findFirst({
      where: { id: analysisId, userId },
    });
    if (!row) throw new Error("Analysis not found");
    return prisma.promptAnalysis.update({
      where: { id: analysisId },
      data: { improved },
    });
  }

  static async clearHistory(userId: string) {
    const enabled = await this.historyEnabled(userId);
    if (!enabled) return { cleared: 0 };
    const result = await prisma.promptAnalysis.deleteMany({ where: { userId } });
    return { cleared: result.count };
  }
}
