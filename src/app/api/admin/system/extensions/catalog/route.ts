import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { getExtensionCatalog } from "@/engine/extensions/catalog";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const installed = await prisma.extension.findMany({
      where: { state: { not: "REMOVED" } },
      select: { slug: true, state: true, version: true },
    });
    const bySlug = new Map(installed.map((e) => [e.slug, e]));
    const entries = getExtensionCatalog().map((entry) => ({
      manifest: entry.manifest,
      category: entry.category,
      icon: entry.icon,
      configFields: entry.configFields,
      installed: bySlug.get(entry.manifest.slug)?.state ?? null,
      installedVersion: bySlug.get(entry.manifest.slug)?.version ?? null,
    }));
    return NextResponse.json({ ok: true, catalog: entries });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Failed to fetch extension catalog" }, { status });
  }
}
