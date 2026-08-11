import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { importFromGitHub, parseGitHubUrl } from "@/lib/github-importer";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();

    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.source.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    if (body.sync === true) {
      if (existing.type !== "GITHUB" || !existing.url) {
        return NextResponse.json(
          { error: "Sync is only supported for GitHub sources with a URL" },
          { status: 400 }
        );
      }
      const parsed = parseGitHubUrl(existing.url);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid GitHub URL" },
          { status: 400 }
        );
      }
      const result = await importFromGitHub(existing.id, parsed.owner, parsed.repo, {
        adminUserId: session.user!.id,
        limit: body.limit,
      });
      return NextResponse.json({ source: existing, import: result });
    }

    const source = await prisma.source.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        url: body.url !== undefined ? body.url : existing.url,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json({ source });
  } catch (error: any) {
    console.error("Error updating source:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update source";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const existing = await prisma.source.findUnique({
      where: { id },
      include: { _count: { select: { prompts: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    if (existing._count.prompts > 0) {
      return NextResponse.json(
        { error: "Cannot delete: prompts are still linked to this source" },
        { status: 409 }
      );
    }

    await prisma.source.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting source:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to delete source";
    return NextResponse.json({ error: message }, { status });
  }
}
