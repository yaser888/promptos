import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "featured") {
      where.isFeatured = true;
    } else if (status === "flagged") {
      where.isFlagged = true;
    }

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.prompt.count({ where }),
    ]);

    return NextResponse.json({ prompts, total });
  } catch (error: any) {
    console.error("Error fetching prompts:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch prompts";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    if (body.action !== "delete") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await prisma.prompt.update({
      where: { id: body.id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error soft-deleting prompt:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to delete prompt";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const prompt = await prisma.prompt.findUnique({ where: { id: body.id } });
    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (body.action === "toggle-featured") {
      await prisma.prompt.update({
        where: { id: body.id },
        data: { isFeatured: !prompt.isFeatured },
      });
    } else if (body.action === "toggle-flag") {
      await prisma.prompt.update({
        where: { id: body.id },
        data: { isFlagged: !prompt.isFlagged },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating prompt:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update prompt";
    return NextResponse.json({ error: message }, { status });
  }
}
