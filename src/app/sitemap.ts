import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { locales } from "@/i18n/config";

const PUBLIC_ROUTES = ["", "library", "marketplace", "blog", "pricing"] as const;

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://promptos.ai";

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of PUBLIC_ROUTES) {
      const path = route ? `/${route}` : "";
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "weekly" : "weekly",
        priority: route === "" ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${path}`])
          ),
        },
      });
    }
  }

  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      select: { slug: true, locale: true, publishedAt: true, updatedAt: true },
    });

    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/${post.locale}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    // DB unavailable — blog posts omitted from sitemap
  }

  return entries;
}
