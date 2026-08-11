import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEnabled } from "@/lib/settings";

export async function GET(req: Request) {
  try {
    if (!(await isEnabled("blogEnabled"))) {
      return NextResponse.json(
        { error: "Blog is currently unavailable", disabled: true },
        { status: 503 }
      );
    }
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "en";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "12", 10) || 12));

    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null as unknown as Date },
      ...(locale === "all" ? {} : { locale }),
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          authorName: true,
          authorRole: true,
          locale: true,
          featured: true,
          publishedAt: true,
          readingMinutes: true,
          viewCount: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 });
  }
}
