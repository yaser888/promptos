import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.setting.findFirst().catch(() => null);
    const siteName = settings?.siteName ?? "PromptOS";
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const prompt = await prisma.prompt
      .findFirst({
        where: { isPublic: true, isDeleted: false },
        orderBy: { likeCount: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          likeCount: true,
          copyCount: true,
          tags: true,
        },
      })
      .catch(() => null);

    const tags = Array.isArray(prompt?.tags) ? (prompt.tags as string[]) : [];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: transparent;
    color: #e4e4e7;
  }
  .card {
    background: linear-gradient(160deg, rgba(16,20,28,.97), rgba(9,12,18,.97));
    border: 1px solid rgba(52,211,153,.25);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,.45);
  }
  .brand {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: #34d399;
  }
  .dot { width: 7px; height: 7px; border-radius: 999px; background: #34d399; }
  h2 { font-size: 16px; line-height: 1.35; color: #f4f4f5; }
  p.desc { font-size: 12.5px; line-height: 1.5; color: #a1a1aa; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag {
    font-size: 10.5px; padding: 3px 8px; border-radius: 6px;
    background: rgba(255,255,255,.06); color: #d4d4d8;
  }
  .stats { display: flex; gap: 14px; font-size: 11.5px; color: #71717a; }
  .stats b { color: #e4e4e7; font-weight: 600; }
  .cta {
    display: block; text-align: center; text-decoration: none;
    margin-top: 4px; padding: 10px 14px; border-radius: 10px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: #052e22; font-size: 13px; font-weight: 800;
  }
  .cta:hover { filter: brightness(1.08); }
</style>
</head>
<body>
  <div class="card">
    <div class="brand"><span class="dot"></span>${escapeHtml(siteName)} — Prompt of the Day</div>
    <h2>${escapeHtml(prompt?.title ?? "No prompts yet")}</h2>
    ${
      prompt?.description
        ? `<p class="desc">${escapeHtml(prompt.description)}</p>`
        : ""
    }
    ${
      tags.length > 0
        ? `<div class="tags">${tags
            .slice(0, 4)
            .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
            .join("")}</div>`
        : ""
    }
    ${
      prompt
        ? `<div class="stats">
            <span>❤️ <b>${prompt.likeCount}</b></span>
            <span>📋 <b>${prompt.copyCount} copies</b></span>
          </div>
          <a class="cta" href="${baseUrl}/prompts/${prompt.id}" target="_blank" rel="noopener">Get this prompt →</a>`
        : ""
    }
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("<html><body>Unavailable</body></html>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 503,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
