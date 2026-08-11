import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { cleanPromptTitle } from "@/lib/prompt-title";

function cleanPromptContent(raw: string): string {
  const content = raw.trim();
  const lines = content.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^GPT URL:/i.test(t)) continue;
    if (/^GPT logo:/i.test(t)) continue;
    if (/^<img\b/.test(t)) continue;
    if (/^!\[/.test(t)) continue;
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{4,}/g, "\n\n\n").trim();
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (body.action === "clean-titles") {
      const prompts = await prisma.prompt.findMany({
        where: { isDeleted: false },
        select: { id: true, title: true },
      });
      const updates: { id: string; title: string }[] = [];
      for (const p of prompts) {
        const cleaned = cleanPromptTitle(p.title);
        if (cleaned && cleaned !== p.title) updates.push({ id: p.id, title: cleaned });
      }
      let updated = 0;
      for (let i = 0; i < updates.length; i += 50) {
        const chunk = updates.slice(i, i + 50);
        await Promise.all(
          chunk.map(async (u) => {
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                await prisma.prompt.update({ where: { id: u.id }, data: { title: u.title } });
                return;
              } catch (err: any) {
                if (attempt === 2) throw err;
                await new Promise((r) => setTimeout(r, 1500));
              }
            }
          })
        );
        updated += chunk.length;
      }
      return NextResponse.json({ success: true, cleaned: updated });
    }

    if (body.action === "clean-content") {
      const prompts = await prisma.prompt.findMany({
        where: { isDeleted: false },
        select: { id: true, content: true },
      });
      const updates: { id: string; content: string }[] = [];
      for (const p of prompts) {
        const cleaned = cleanPromptContent(p.content);
        if (cleaned !== p.content) updates.push({ id: p.id, content: cleaned });
      }
      let updated = 0;
      for (let i = 0; i < updates.length; i += 50) {
        const chunk = updates.slice(i, i + 50);
        await Promise.all(
          chunk.map(async (u) => {
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                await prisma.prompt.update({ where: { id: u.id }, data: { content: u.content } });
                return;
              } catch (err: any) {
                if (attempt === 2) throw err;
                await new Promise((r) => setTimeout(r, 1500));
              }
            }
          })
        );
        updated += chunk.length;
      }
      return NextResponse.json({ success: true, cleaned: updated });
    }

    if (body.action === "dedupe") {
      const sourceId: string | undefined = body.sourceId;
      const where: any = { isDeleted: false };
      if (sourceId) where.sourceId = sourceId;

      const prompts = await prisma.prompt.findMany({
        where,
        select: { id: true, title: true },
        orderBy: { createdAt: "asc" },
      });

      const seen = new Map<string, string>();
      const toDelete: string[] = [];
      for (const p of prompts) {
        const key = p.title.trim().toLowerCase();
        if (seen.has(key)) toDelete.push(p.id);
        else seen.set(key, p.id);
      }

      let deleted = 0;
      for (let i = 0; i < toDelete.length; i += 50) {
        const chunk = toDelete.slice(i, i + 50);
        const res = await prisma.prompt.deleteMany({ where: { id: { in: chunk } } });
        deleted += res.count;
      }
      return NextResponse.json({ success: true, deleted, duplicatesFound: toDelete.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in prompt bulk action:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to process bulk action";
    return NextResponse.json({ error: message }, { status });
  }
}
