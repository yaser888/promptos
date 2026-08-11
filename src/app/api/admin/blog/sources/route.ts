import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { fetchAiSources, clearAiSourcesCache } from "@/services/blog-publisher.service";

export async function GET() {
  try {
    await requireAdmin();
    const sources = await fetchAiSources(6);
    return NextResponse.json({ sources });
  } catch (error: any) {
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch sources";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST() {
  try {
    await requireAdmin();
    clearAiSourcesCache();
    const sources = await fetchAiSources(6);
    return NextResponse.json({ sources });
  } catch (error: any) {
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to refresh sources";
    return NextResponse.json({ error: message }, { status });
  }
}