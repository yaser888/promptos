import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const slug = body.slug || existing.slug;
    if (slug !== existing.slug) {
      const duplicate = await prisma.category.findFirst({ where: { slug } });
      if (duplicate) {
        return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name || existing.name,
        slug,
        description: body.description ?? existing.description,
        color: body.color || existing.color,
      },
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error("Error updating category:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update category";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { prompts: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    if (existing._count.prompts > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${existing._count.prompts} prompt(s) are still in this category` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to delete category";
    return NextResponse.json({ error: message }, { status });
  }
}
