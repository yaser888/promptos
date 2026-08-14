import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST() {
  await destroySession();
  return NextResponse.json({ signedOut: true });
}