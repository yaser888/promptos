import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeSlug(slug: string, title: string): string {
  const base = slug?.trim() || slugify(title);
  return base === "" ? `post-${Date.now()}` : base;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "all";
    const status = url.searchParams.get("status") || "all";
    const search = url.searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (locale !== "all") where.locale = locale;
    if (status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" as const } },
        { slug: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: [{ status: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error("Error fetching blog posts:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch blog posts";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const slug = normalizeSlug(body.slug, body.title);
    const isPublished = body.status === "PUBLISHED";

    const post = await prisma.blogPost.create({
      data: {
        title: body.title.trim(),
        slug,
        excerpt: body.excerpt?.trim() || null,
        content: body.content,
        coverImage: body.coverImage?.trim() || null,
        authorName: body.authorName?.trim() || "PromptOS Team",
        authorRole: body.authorRole?.trim() || null,
        locale: body.locale || "en",
        status: isPublished ? "PUBLISHED" : "DRAFT",
        publishedAt: isPublished ? new Date() : null,
        featured: !!body.featured,
        seoTitle: body.seoTitle?.trim() || null,
        seoDescription: body.seoDescription?.trim() || null,
        seoKeywords: body.seoKeywords?.trim() || null,
        canonicalUrl: body.canonicalUrl?.trim() || null,
        readingMinutes: Math.max(1, parseInt(body.readingMinutes, 10) || 5),
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating blog post:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A post with this slug already exists" }, { status: 409 });
    }
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to create blog post";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (fields.title !== undefined) data.title = fields.title?.trim();
    if (fields.excerpt !== undefined) data.excerpt = fields.excerpt?.trim() || null;
    if (fields.content !== undefined) data.content = fields.content;
    if (fields.coverImage !== undefined) data.coverImage = fields.coverImage?.trim() || null;
    if (fields.authorName !== undefined) data.authorName = fields.authorName?.trim() || "PromptOS Team";
    if (fields.authorRole !== undefined) data.authorRole = fields.authorRole?.trim() || null;
    if (fields.locale !== undefined) data.locale = fields.locale || "en";
    if (fields.featured !== undefined) data.featured = !!fields.featured;
    if (fields.seoTitle !== undefined) data.seoTitle = fields.seoTitle?.trim() || null;
    if (fields.seoDescription !== undefined) data.seoDescription = fields.seoDescription?.trim() || null;
    if (fields.seoKeywords !== undefined) data.seoKeywords = fields.seoKeywords?.trim() || null;
    if (fields.canonicalUrl !== undefined) data.canonicalUrl = fields.canonicalUrl?.trim() || null;
    if (fields.readingMinutes !== undefined) data.readingMinutes = Math.max(1, parseInt(fields.readingMinutes, 10) || 5);
    if (fields.slug !== undefined && fields.slug !== "") {
      data.slug = normalizeSlug(fields.slug, fields.title || fields.slug);
    }

    if (fields.status !== undefined) {
      const existing = await prisma.blogPost.findUnique({ where: { id } });
      const becomingPublished = fields.status === "PUBLISHED";
      data.status = becomingPublished ? "PUBLISHED" : "DRAFT";
      if (becomingPublished && existing?.status !== "PUBLISHED") {
        data.publishedAt = new Date();
      }
      if (!becomingPublished) {
        data.publishedAt = null;
      }
    }

    const post = await prisma.blogPost.update({ where: { id }, data });

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error("Error updating blog post:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A post with this slug already exists" }, { status: 409 });
    }
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update blog post";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    await prisma.blogPost.delete({ where: { id: body.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting blog post:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to delete blog post";
    return NextResponse.json({ error: message }, { status });
  }
}
