import { NextRequest, NextResponse } from "next/server";
import { registerWithPassword, createSession, clerkEnabled } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (clerkEnabled) {
    return NextResponse.json({ error: "Clerk authentication is enabled." }, { status: 400 });
  }
  try {
    const body = await req.json().catch(() => null);
    const user = await registerWithPassword({
      name: body?.name,
      email: body?.email,
      password: body?.password,
    });
    if (!user) {
      return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
    await createSession(user.clerkId);
    return NextResponse.json({ user });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Registration failed" }, { status });
  }
}