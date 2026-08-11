import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const SOURCE_TYPES = ["GITHUB", "CSV", "MARKDOWN", "JSON", "MANUAL", "API"];

export async function GET() {
  try {
    await requireAdmin();

    const [sources, promptCounts] = await Promise.all([
      prisma.source.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { prompts: true, importJobs: true } },
        },
      }),
      prisma.prompt.groupBy({ by: ["sourceId"], _count: { _all: true } }),
    ]);

    const countMap = new Map(promptCounts.map((p) => [p.sourceId, p._count._all]));
    const enriched = sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      url: s.url,
      isActive: s.isActive,
      lastSync: s.lastSync,
      createdAt: s.createdAt,
      prompts: countMap.get(s.id) ?? 0,
      importJobs: s._count.importJobs,
    }));

    return NextResponse.json({ sources: enriched });
  } catch (error: any) {
    console.error("Error fetching sources:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch sources";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const type = (body.type || "MANUAL").toUpperCase();
    if (!SOURCE_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid source type" }, { status: 400 });
    }

    const source = await prisma.source.create({
      data: {
        name: body.name,
        type: type as any,
        url: body.url || null,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({ source });
  } catch (error: any) {
    console.error("Error creating source:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to create source";
    return NextResponse.json({ error: message }, { status });
  }
}
