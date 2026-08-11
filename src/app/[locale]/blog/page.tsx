import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("blog");

  let siteName = "PromptOS";
  let description = t("seoDescription");
  try {
    const setting = await prisma.setting.findFirst();
    if (setting) {
      siteName = setting.siteName || siteName;
      description = setting.siteDescription || description;
    }
  } catch {
    // DB unavailable — fall back to defaults
  }

  return {
    title: t("title"),
    description,
    openGraph: {
      type: "website",
      locale,
      siteName,
      title: t("title"),
      description,
    },
  };
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("blog");

  let posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
    authorName: string;
    locale: string;
    featured: boolean;
    publishedAt: Date | null;
    readingMinutes: number;
  }> = [];

  try {
    posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null }, locale },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        authorName: true,
        locale: true,
        featured: true,
        publishedAt: true,
        readingMinutes: true,
      },
    });
  } catch {
    // DB unavailable — empty blog
  }

  if (posts.length === 0) {
    const allPosts = await prisma.blogPost
      .findMany({
        where: { status: "PUBLISHED", publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          authorName: true,
          locale: true,
          featured: true,
          publishedAt: true,
          readingMinutes: true,
        },
      })
      .catch(() => [] as typeof posts);
    if (allPosts.length > 0) {
      notFound();
    }
  }

  const featured = posts.find((p) => p.featured) || null;

  return (
    <>
      <Header />
      <main className="pt-24 pb-16">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">{t("badge")}</span>
            </div>
            <h1 className="text-4xl font-bold text-charcoal-100 mb-4">{t("title")}</h1>
            <p className="text-lg text-charcoal-400">{t("subtitle")}</p>
          </div>

          {posts.length === 0 ? (
            <Card glass className="max-w-2xl mx-auto">
              <CardContent className="p-10 text-center">
                <p className="text-charcoal-500">{t("empty")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {featured && (
                <Link
                  href={`/${locale}/blog/${featured.slug}`}
                  className="block max-w-4xl mx-auto mb-12 group"
                >
                  <Card glass className="overflow-hidden hover:border-emerald-500/30 transition-all">
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-8 flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                              {t("featured")}
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold text-charcoal-100 mb-3 group-hover:text-emerald-400 transition-colors">
                            {featured.title}
                          </h2>
                          {featured.excerpt && (
                            <p className="text-charcoal-400 text-sm mb-4 line-clamp-3">
                              {featured.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-charcoal-500">
                            <span className="font-medium text-charcoal-300">{featured.authorName}</span>
                            {featured.publishedAt && (
                              <span>{formatDate(featured.publishedAt, locale)}</span>
                            )}
                            <span>{featured.readingMinutes} min read</span>
                          </div>
                        </div>
                        {featured.coverImage ? (
                          <div className="relative min-h-[220px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={featured.coverImage}
                              alt={featured.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative min-h-[220px] bg-gradient-to-br from-emerald-500/10 via-charcoal-900 to-charcoal-950" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {posts
                  .filter((p) => !(featured && p.id === featured.id))
                  .map((post) => (
                    <Link key={post.id} href={`/${locale}/blog/${post.slug}`} className="group">
                      <Card glass className="h-full overflow-hidden hover:border-emerald-500/30 transition-all">
                        <CardContent className="p-0 flex flex-col h-full">
                          {post.coverImage ? (
                            <div className="relative h-44 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="h-44 bg-gradient-to-br from-emerald-500/10 via-charcoal-900 to-charcoal-950" />
                          )}
                          <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-semibold text-charcoal-100 mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                            {post.excerpt && (
                              <p className="text-sm text-charcoal-400 mb-4 line-clamp-3">
                                {post.excerpt}
                              </p>
                            )}
                            <div className="mt-auto flex items-center gap-3 text-xs text-charcoal-500">
                              <span className="font-medium text-charcoal-300">{post.authorName}</span>
                              {post.publishedAt && <span>{formatDate(post.publishedAt, locale)}</span>}
                              <span>{post.readingMinutes} min</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
            </>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
