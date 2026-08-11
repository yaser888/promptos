import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/core/security/rate-limit";

const NEWSLETTER_KEY = "ext.newsletterSubscribers";

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, { namespace: "ext/newsletter", limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const settings = await prisma.setting.findFirst();
    if (!settings) {
      return NextResponse.json({ error: "Newsletter not available" }, { status: 503 });
    }

    const metadata = (settings.metadata ?? {}) as Record<string, unknown>;
    const subscribers = Array.isArray(metadata[NEWSLETTER_KEY])
      ? (metadata[NEWSLETTER_KEY] as { email: string; subscribedAt: string }[])
      : [];

    if (subscribers.some((s) => s.email === email)) {
      return NextResponse.json({ ok: true, already: true });
    }

    subscribers.push({ email, subscribedAt: new Date().toISOString() });

    await prisma.setting.update({
      where: { id: settings.id },
      data: { metadata: { ...metadata, [NEWSLETTER_KEY]: subscribers } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
