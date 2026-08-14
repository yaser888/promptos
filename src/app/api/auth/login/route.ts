import { NextRequest, NextResponse } from "next/server";
import { loginWithPassword, createSession, clerkEnabled } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (clerkEnabled) {
    return NextResponse.json({ error: "Clerk authentication is enabled." }, { status: 400 });
  }
  try {
    const body = await req.json().catch(() => null);
    const sessionUser = await loginWithPassword({
      email: body?.email,
      password: body?.password,
    });
    if (!sessionUser) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createSession(sessionUser.clerkId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
}