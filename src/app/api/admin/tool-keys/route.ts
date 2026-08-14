import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { listToolKeys, saveToolKey, deleteToolKey, TOOL_PROVIDERS } from "@/lib/tool-keys";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const keys = await listToolKeys();
  return NextResponse.json({ keys, providers: TOOL_PROVIDERS });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const session = await requireAdmin();
  if (!session.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const removed = await deleteToolKey(body?.name);
  if (!removed) return NextResponse.json({ error: "Tool key not found" }, { status: 404 });
  const keys = await listToolKeys();
  return NextResponse.json({ keys });
}