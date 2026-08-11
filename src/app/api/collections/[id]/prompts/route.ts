import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { PromptService } from "@/services/prompt.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: collectionId } = await params;
    const { promptId, saved } = await req.json();
    if (!promptId) {
      return NextResponse.json({ error: "promptId is required" }, { status: 400 });
    }
    const result = await PromptService.saveToCollection(
      promptId,
      collectionId,
      user.id,
      Boolean(saved)
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error saving prompt to collection:", error);
    return NextResponse.json(
      { error: "Failed to save prompt to collection" },
      { status: 500 }
    );
  }
}