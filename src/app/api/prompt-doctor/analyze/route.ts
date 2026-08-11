import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { PromptDoctorService } from "@/services/prompt-doctor.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const data = await req.json();

    let userId: string | undefined;
    let clerkId: string | undefined;
    if (session.user) {
      const user = await prisma.user.findUnique({
        where: { clerkId: session.user.clerkId },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      userId = user.id;
      clerkId = user.clerkId;
    }

    const result = await PromptDoctorService.analyze(
      { content: data.content, title: data.title },
      { userId, clerkId }
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze prompt";
    const status = message === "Content is required" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}