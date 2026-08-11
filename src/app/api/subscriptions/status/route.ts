import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({
        plan: "FREE",
        status: "ACTIVE",
        features: [],
      });
    }

    const isActive =
      subscription.status === "ACTIVE" || subscription.status === "TRIALING";
    const isTrialing = subscription.status === "TRIALING";
    const trialEnd = subscription.trialEnd;
    const isExpired = trialEnd && new Date() > trialEnd;

    if (isTrialing && isExpired) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json({
        plan: "FREE",
        status: "EXPIRED",
        features: [],
      });
    }

    const plan = subscription.plan;
    const features = await getPlanFeatures(plan);

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
      canceledAt: subscription.canceledAt,
      isActive,
      isTrialing,
      features,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}

async function getPlanFeatures(plan: string): Promise<string[]> {
  const FALLBACK_FEATURES: Record<string, string[]> = {
    FREE: ["limited_prompts", "basic_library", "copy_share"],
    PRO: [
      "unlimited_prompts",
      "all_tools",
      "all_languages",
      "full_sync",
      "version_history",
    ],
    TEAM: [
      "unlimited_prompts",
      "all_tools",
      "all_languages",
      "full_sync",
      "version_history",
      "workspaces",
      "permissions",
    ],
    ENTERPRISE: [
      "unlimited_prompts",
      "all_tools",
      "all_languages",
      "full_sync",
      "version_history",
      "workspaces",
      "permissions",
      "custom_api",
      "sso",
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
