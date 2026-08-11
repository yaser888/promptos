import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { UsageService } from "@/services/usage.service";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await UsageService.getUsageStats(session.user.clerkId);
    const dailyUsage = await UsageService.getDailyUsage(session.user.clerkId);

    return NextResponse.json({
      stats,
      dailyUsage,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
