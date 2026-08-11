import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import BlocksRenderer from "@/components/pages/blocks-renderer";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-auth";
import type { PageBlock, PageSeo } from "@/engine/pages/pages.service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  let page: { title: string; seo: unknown; content: unknown } | null = null;
  try {
    page = await prisma.page.findFirst({
      where: { slug, status: "published", isPublic: true },
      select: { title: true, seo: true, content: true },
    });
  } catch {
    // DB unavailable
  }

  if (!page) return { title: "Not Found" };

  const seo = (page.seo ?? {}) as PageSeo;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const title = seo.title || page.title;
  const description = seo.description || undefined;
  const images = seo.ogImage ? [{ url: seo.ogImage }] : undefined;

  return {
    title,
    description,
    ...(seo.keywords ? { keywords: seo.keywords.split(",").map((k) => k.trim()) } : {}),
    ...(seo.canonical ? { alternates: { canonical: seo.canonical } } : {}),
    robots: seo.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale,
      siteName: "PromptOS",
      title,
      description,
      ...(images ? { images } : {}),
      url: `${baseUrl}/${locale}/pages/${slug}`,
    },
    metadataBase: new URL(baseUrl),
  };
}

export default async function CustomPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("pages");

  let page: {
    id: string;
    title: string;
    content: unknown;
    requiresAuth: boolean;
    isPublic: boolean;
  } | null = null;

  try {
    page = await prisma.page.findFirst({
      where: { slug, status: "published" },
      select: { id: true, title: true, content: true, requiresAuth: true, isPublic: true },
    });
  } catch {
    // DB unavailable
  }

  if (!page || !page.isPublic) notFound();

  let authed = false;
  if (page.requiresAuth) {
    const session = await getServerSession();
    authed = !!session.user;
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-16">
        <Container>
          <article className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-charcoal-100 mb-8 leading-tight">{page.title}</h1>

            {page.requiresAuth && !authed ? (
              <div className="rounded-xl border border-charcoal-800 bg-surface-secondary p-8 text-center">
                <p className="text-lg text-charcoal-200 mb-4">{t("authRequired")}</p>
                <Link
                  href={`/${locale}/sign-in`}
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  {t("signIn")}
                </Link>
              </div>
            ) : (
              <BlocksRenderer blocks={(page.content as PageBlock[]) ?? []} />
            )}
          </article>
        </Container>
      </main>
      <Footer />
    </>
  );
}