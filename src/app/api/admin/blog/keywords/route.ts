import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { researchKeywords } from "@/services/blog-publisher.service";

export async function GET() {
  try {
    await requireAdmin();
    const keywords = await researchKeywords();
    return NextResponse.json({ keywords });
  } catch (error: any) {
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch keywords";
    return NextResponse.json({ error: message }, { status });
  }
}
