import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ReactMarkdown from "react-markdown";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  let post: {
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
    authorName: string;
    publishedAt: Date | null;
  } | null = null;

  try {
    post = await prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED", publishedAt: { not: null } },
      select: {
        title: true,
        excerpt: true,
        coverImage: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
        canonicalUrl: true,
        authorName: true,
        publishedAt: true,
      },
    });
  } catch {
    // DB unavailable
  }

  if (!post) return { title: "Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const title = post.seoTitle || post.title;
  const description =
    post.seoDescription || post.excerpt || "Read this article on PromptOS";
  const images = post.coverImage ? [{ url: post.coverImage }] : undefined;

  return {
    title,
    description,
    ...(post.seoKeywords ? { keywords: post.seoKeywords.split(",").map((k) => k.trim()) } : {}),
    alternates: {
      canonical: post.canonicalUrl || `/${locale}/blog/${slug}`,
    },
    authors: [{ name: post.authorName }],
    openGraph: {
      type: "article",
      locale,
      siteName: "PromptOS",
      title,
      description,
      ...(images ? { images } : {}),
      ...(post.publishedAt
        ? { publishedTime: post.publishedAt.toISOString() }
        : {}),
      authors: [post.authorName],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
    metadataBase: new URL(baseUrl),
  };
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("blog");

  let post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    coverImage: string | null;
    authorName: string;
    authorRole: string | null;
    locale: string;
    publishedAt: Date | null;
    readingMinutes: number;
    seoTitle: string | null;
    seoDescription: string | null;
  } | null = null;

  let related: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
  }> = [];

  try {
    post = await prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED", publishedAt: { not: null } },
    });
    if (post) {
      related = await prisma.blogPost.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { not: null },
          id: { not: post.id },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
        },
      });
    }
  } catch {
    // DB unavailable
  }

  if (!post) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: post.coverImage || undefined,
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    datePublished: post.publishedAt ? post.publishedAt.toISOString() : undefined,
    url: `${baseUrl}/${locale}/blog/${post.slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/${locale}/blog/${post.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="pt-24 pb-16">
        <Container>
          <article className="max-w-3xl mx-auto">
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-emerald-400 transition-colors mb-8"
            >
              <span aria-hidden>←</span> {t("backToBlog")}
            </Link>

            <h1 className="text-4xl font-bold text-charcoal-100 mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-charcoal-500 mb-8">
              <span className="font-medium text-charcoal-300">{post.authorName}</span>
              {post.authorRole && <span>· {post.authorRole}</span>}
              {post.publishedAt && (
                <span>· {formatDate(post.publishedAt, locale)}</span>
              )}
              <span>· {post.readingMinutes} min read</span>
            </div>

            {post.coverImage && (
              <div className="rounded-2xl overflow-hidden mb-8 border border-charcoal-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full object-cover max-h-[420px]"
                />
              </div>
            )}

            {post.excerpt && (
              <p className="text-lg text-charcoal-300 border-s-4 border-emerald-500/50 ps-4 mb-8">
                {post.excerpt}
              </p>
            )}

            <Card glass>
              <CardContent className="p-8">
                <div className="prose-invert max-w-none text-charcoal-300 leading-relaxed blog-content">
                  <ReactMarkdown
                    components={{
                      h1: (props) => (
                        <h1 className="text-3xl font-bold text-charcoal-100 mt-8 mb-4" {...props} />
                      ),
                      h2: (props) => (
                        <h2 className="text-2xl font-bold text-charcoal-100 mt-8 mb-4" {...props} />
                      ),
                      h3: (props) => (
                        <h3 className="text-xl font-semibold text-charcoal-100 mt-6 mb-3" {...props} />
                      ),
                      p: (props) => <p className="mb-4" {...props} />,
                      ul: (props) => (
                        <ul className="list-disc ps-6 mb-4 space-y-1" {...props} />
                      ),
                      ol: (props) => (
                        <ol className="list-decimal ps-6 mb-4 space-y-1" {...props} />
                      ),
                      a: (props) => (
                        <a
                          className="text-emerald-400 hover:text-emerald-300 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      blockquote: (props) => (
                        <blockquote
                          className="border-s-4 border-emerald-500/50 ps-4 my-4 text-charcoal-400 italic"
                          {...props}
                        />
                      ),
                      code: (props) => (
                        <code
                          className="bg-charcoal-900 px-1.5 py-0.5 rounded text-sm text-emerald-300 font-mono"
                          {...props}
                        />
                      ),
                      pre: (props) => (
                        <pre
                          className="bg-charcoal-950 border border-charcoal-800 rounded-xl p-4 overflow-x-auto mb-4 text-sm"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {post.content}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </article>

          {related.length > 0 && (
            <div className="max-w-3xl mx-auto mt-12">
              <h2 className="text-xl font-bold text-charcoal-100 mb-6">{t("related")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${locale}/blog/${item.slug}`}
                    className="group"
                  >
                    <Card glass className="h-full hover:border-emerald-500/30 transition-all">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-charcoal-100 group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        {item.excerpt && (
                          <p className="text-xs text-charcoal-500 mt-2 line-clamp-2">
                            {item.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
