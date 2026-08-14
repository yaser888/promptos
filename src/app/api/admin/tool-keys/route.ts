import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { listToolKeys, saveToolKey, deleteToolKey, TOOL_PROVIDERS } from "@/lib/tool-keys";

export const runtime = "nodejs";

async function guard() {
  const session = await requireAdmin().catch((err: any) => ({ error: err?.status || 500 }));
  if ((session as any)?.error) {
    return { forbidden: true, status: (session as any).error === 401 ? 401 : 403 };
  }
  return { forbidden: false };
}

export async function GET() {
  const g = await guard();
  if (g.forbidden) return NextResponse.json({ error: "Forbidden" }, { status: g.status });
  try {
    const keys = await listToolKeys();
    return NextResponse.json({ keys, providers: TOOL_PROVIDERS });
  } catch {
    return NextResponse.json({ error: "Failed to load tool keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g.forbidden) return NextResponse.json({ error: "Forbidden" }, { status: g.status });
  try {
    const body = await req.json().catch(() => null);
    await saveToolKey(body?.name, body?.value);
    const keys = await listToolKeys();
    return NextResponse.json({ keys });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save tool key" }, { status: err?.status || 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if (g.forbidden) return NextResponse.json({ error: "Forbidden" }, { status: g.status });
  try {
    const body = await req.json().catch(() => null);
    const removed = await deleteToolKey(body?.name);
    if (!removed) return NextResponse.json({ error: "Tool key not found" }, { status: 404 });
    const keys = await listToolKeys();
    return NextResponse.json({ keys });
  } catch {
    return NextResponse.json({ error: "Failed to delete tool key" }, { status: 500 });
  }
}