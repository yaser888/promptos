import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { prompts: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch categories";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        color: body.color,
      },
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error("Error creating category:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { id, ...fields } = body;

    const category = await prisma.category.update({
      where: { id },
      data: fields,
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error("Error updating category:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update category";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    await prisma.category.delete({ where: { id: body.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to delete category";
    return NextResponse.json({ error: message }, { status });
  }
}
