import { NextResponse } from "next/server";
import { runHomeSections } from "@/engine/extensions/runtime";

export async function GET() {
  try {
    const sections = await runHomeSections();
    return NextResponse.json({ ok: true, sections });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message || error) },
      { status: 500 }
    );
  }
}
