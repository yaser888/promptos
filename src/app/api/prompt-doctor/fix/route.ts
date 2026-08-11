import { NextRequest, NextResponse } from "next/server";
import { PromptDoctorService } from "@/services/prompt-doctor.service";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    const result = await PromptDoctorService.fix(content);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to improve prompt";
    const status = message === "Content is required" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}