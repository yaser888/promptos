import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const schedule = await prisma.blogSchedule.upsert({
      where: { id: "default" },
      update: {},
      create: {},
    });
    return NextResponse.json({ schedule });
  } catch (error: any) {
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch schedule";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const publishHour =
      body.publishHour === undefined ? undefined : Math.min(23, Math.max(0, parseInt(body.publishHour, 10) || 0));
    const maxPerDay =
      body.maxPerDay === undefined ? undefined : Math.min(10, Math.max(1, parseInt(body.maxPerDay, 10) || 1));
    const keywords = Array.isArray(body.keywords)
      ? body.keywords.map((k: string) => String(k).trim()).filter(Boolean).slice(0, 50)
      : undefined;

    const data: Record<string, unknown> = {};
    if (body.enabled !== undefined) data.enabled = !!body.enabled;
    if (publishHour !== undefined) data.publishHour = publishHour;
    if (body.locale !== undefined) data.locale = String(body.locale || "en");
    if (body.authorName !== undefined) data.authorName = String(body.authorName || "PromptOS Team").trim();
    if (body.authorRole !== undefined) data.authorRole = body.authorRole?.trim() || null;
    if (maxPerDay !== undefined) data.maxPerDay = maxPerDay;
    if (body.publishAsDraft !== undefined) data.publishAsDraft = !!body.publishAsDraft;
    if (keywords !== undefined) data.keywords = keywords;

    const schedule = await prisma.blogSchedule.upsert({
      where: { id: "default" },
      update: data,
      create: {
        ...data,
        id: "default",
      },
    });

    return NextResponse.json({ schedule });
  } catch (error: any) {
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update schedule";
    return NextResponse.json({ error: message }, { status });
  }
}
