import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { importFromGitHub, parseGitHubUrl } from "@/lib/github-importer";
import { importFromCsv } from "@/lib/csv-importer";

const MAX_CSV_BYTES = 32 * 1024 * 1024;

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = search
      ? { source: { name: { contains: search, mode: "insensitive" } } }
      : {};

    const [imports, total] = await Promise.all([
      prisma.importJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          source: { select: { id: true, name: true, type: true } },
        },
      }),
      prisma.importJob.count({ where }),
    ]);

    return NextResponse.json({ imports, total });
  } catch (error: any) {
    console.error("Error fetching imports:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch imports";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const { sourceId, limit } = body;
    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
    }

    const source = await prisma.source.findUnique({ where: { id: sourceId } });
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    if (source.type === "GITHUB" && source.url) {
      const parsed = parseGitHubUrl(source.url);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid GitHub URL on source" }, { status: 400 });
      }
      const result = await importFromGitHub(source.id, parsed.owner, parsed.repo, {
        adminUserId: session.user!.id,
        limit,
      });
      const job = await prisma.importJob.findFirst({
        where: { sourceId },
        orderBy: { createdAt: "desc" },
        include: { source: { select: { id: true, name: true, type: true } } },
      });
      return NextResponse.json({ job, result });
    }

    if (source.type === "CSV" && source.url) {
      const res = await fetch(source.url, { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to download CSV (${res.status})` }, { status: 502 });
      }
      const cl = Number(res.headers.get("content-length") || 0);
      if (cl > MAX_CSV_BYTES) {
        return NextResponse.json({ error: "CSV file exceeds the 32MB import limit" }, { status: 413 });
      }
      const rawText = await res.text();
      if (rawText.length > MAX_CSV_BYTES) {
        return NextResponse.json({ error: "CSV file exceeds the 32MB import limit" }, { status: 413 });
      }
      const result = await importFromCsv(source.id, rawText, { adminUserId: session.user!.id, limit });
      const job = await prisma.importJob.findFirst({
        where: { sourceId },
        orderBy: { createdAt: "desc" },
        include: { source: { select: { id: true, name: true, type: true } } },
      });
      return NextResponse.json({ job, result });
    }

    const job = await prisma.importJob.create({
      data: {
        sourceId,
        status: source.type === "MANUAL" ? "COMPLETED" : "PENDING",
        totalItems: 0,
        importedItems: 0,
        failedItems: 0,
        startedAt: new Date(),
        completedAt: source.type === "MANUAL" ? new Date() : null,
      },
      include: { source: { select: { id: true, name: true, type: true } } },
    });

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("Error creating import job:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to create import job";
    return NextResponse.json({ error: message }, { status });
  }
}
