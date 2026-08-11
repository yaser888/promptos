import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { getLanguageRegistry, saveLanguageRegistry } from "@/lib/site-languages";

export async function GET() {
  try {
    await requireAdmin();
    const registry = await getLanguageRegistry();
    return NextResponse.json({ languages: registry });
  } catch (error: unknown) {
    const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : 500;
    const message =
      status === 401 || status === 403
        ? (error as Error).message
        : "Failed to fetch languages";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const saved = await saveLanguageRegistry(body.languages);
    return NextResponse.json({ languages: saved });
  } catch (error: unknown) {
    const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : 500;
    const message =
      status === 401 || status === 403
        ? (error as Error).message
        : "Failed to update languages";
    return NextResponse.json({ error: message }, { status });
  }
}