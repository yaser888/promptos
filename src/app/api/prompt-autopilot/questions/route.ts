import { NextRequest, NextResponse } from "next/server";
import { PromptAutopilotService } from "@/services/prompt-autopilot.service";

export async function POST(req: NextRequest) {
  try {
    const { goal } = await req.json();
    const questionSet = PromptAutopilotService.analyze(goal);
    return NextResponse.json(questionSet);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze goal";
    const status = message === "Goal is required" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}