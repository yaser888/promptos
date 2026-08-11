import { NextRequest, NextResponse } from "next/server";
import { PromptService } from "@/services/prompt.service";

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(raw) || 100, 1), 200);
    const tags = await PromptService.listTags(limit);
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}