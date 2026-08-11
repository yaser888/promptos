import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export class SubscriptionService {
  static async getSubscription(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
    });
  }

  static async createSubscription(
    userId: string,
    plan: string,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: plan as any,
        status: "ACTIVE",
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: null,
        canceledAt: null,
      },
      create: {
        userId,
        plan: plan as any,
        status: "TRIALING",
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  static async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string
  ) {
    return prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: { status: status as any },
    });
  }

  static async cancelSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error("No subscription found");
    }

    if (subscription.stripeSubscriptionId) {
      await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return prisma.subscription.update({
      where: { userId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });
  }

  static async checkAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== "ACTIVE") {
      return false;
    }

    const plan = subscription.plan;
    const planFeatures = await this.getPlanFeatures(plan);

    return planFeatures.includes(feature);
  }

  static async incrementDailyPromptCount(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return false;

    const now = new Date();
    const lastReset = new Date(user.lastDailyReset);
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    const count = isNewDay ? 1 : user.dailyPromptCount + 1;

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    const isPro =
      subscription?.plan === "PRO" ||
      subscription?.plan === "TEAM" ||
      subscription?.plan === "ENTERPRISE";

    if (!isPro && count > 10) {
      return false;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyPromptCount: count,
        lastDailyReset: isNewDay ? now : lastReset,
      },
    });

    return true;
  }

  static async getPlanFeatures(plan: string): Promise<string[]> {
    const FALLBACK_FEATURES: Record<string, string[]> = {
      FREE: [
        "limited_prompts",
        "basic_library",
        "save_prompts",
        "copy_share",
        "two_languages",
        "basic_sync",
      ],
      PRO: [
        "unlimited_prompts",
        "all_tools",
        "all_templates",
        "all_languages",
        "full_sync",
        "all_exports",
        "version_history",
        "ai_optimizer",
        "ai_analyzer",
        "priority_support",
      ],
      TEAM: [
        "unlimited_prompts",
        "all_tools",
        "all_templates",
        "all_languages",
        "full_sync",
        "all_exports",
        "version_history",
        "ai_optimizer",
        "ai_analyzer",
        "priority_support",
        "workspaces",
        "project_sharing",
        "permissions",
        "team_analytics",
        "activity_log",
        "admin_dashboard",
      ],
      ENTERPRISE: [
        "unlimited_prompts",
        "all_tools",
        "all_templates",
        "all_languages",
        "full_sync",
        "all_exports",
        "version_history",
        "ai_optimizer",
        "ai_analyzer",
        "priority_support",
        "workspaces",
        "project_sharing",
        "permissions",
        "team_analytics",
        "activity_log",
        "admin_dashboard",
        "custom_api",
        "dedicated_hosting",
        "sso",
        "dedicated_support",
        "account_manager",
        "advanced_security",
        "sla",
      ],
    };

    try {
      const dbPlan = await prisma.plan.findUnique({
        where: { key: plan },
        include: { features: { orderBy: { sortOrder: "asc" } } },
      });
      if (dbPlan && dbPlan.features.length > 0) {
        return dbPlan.features.map((f) => f.name);
      }
    } catch (error) {
      console.error("Error reading plan features from DB:", error);
    }

    return FALLBACK_FEATURES[plan] || [];
  }
}
