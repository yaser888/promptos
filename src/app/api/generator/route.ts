import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { GeneratorService } from "@/services/generator.service";
import { UsageService } from "@/services/usage.service";
import { PromptService } from "@/services/prompt.service";
import { prisma } from "@/lib/prisma";
import { isEnabled } from "@/lib/settings";

export async function GET() {
  try {
    if (!(await isEnabled("generatorEnabled"))) {
      return NextResponse.json(
        { error: "Generator is currently unavailable", disabled: true },
        { status: 503 }
      );
    }
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await GeneratorService.getHistory(session.user.clerkId, 10);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching generator history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { idea, platform, tone, language, complexity, length, outputFormat } =
      data;

    if (!idea || !idea.trim()) {
      return NextResponse.json(
        { error: "Idea is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const content = GeneratorService.buildPrompt({
      idea,
      platform: platform || "GENERIC",
      tone: tone || "PROFESSIONAL",
      language: language || "en",
      complexity: complexity || "INTERMEDIATE",
      length: length || "MEDIUM",
      outputFormat: outputFormat || "MARKDOWN",
    });

    const title = idea.trim().replace(/\s+/g, " ").slice(0, 80);

    const prompt = await PromptService.createPrompt({
      title,
      content,
      description: `Generated with PromptOS Generator (${platform || "Generic"})`,
      platform,
      tone,
      language,
      complexity,
      length,
      outputFormat,
      userId: user.id,
      isPublic: false,
    });

    await UsageService.track(session.user.clerkId, "PROMPT_GENERATE", {
      idea,
      platform,
      promptId: prompt.id,
    });

    return NextResponse.json({ content, promptId: prompt.id }, { status: 201 });
  } catch (error) {
    console.error("Error generating prompt:", error);
    return NextResponse.json(
      { error: "Failed to generate prompt" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await GeneratorService.clearHistory(session.user.clerkId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error clearing generator history:", error);
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 }
    );
  }
}
