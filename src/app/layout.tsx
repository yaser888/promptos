import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/utils/cn";
import { prisma } from "@/lib/prisma";
import { getDirection } from "@/i18n/config";
import { getLanguageDirection } from "@/lib/site-languages";
import { getLocale as getIntlLocale } from "next-intl/server";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const DEFAULT_NAME = "PromptOS";
const DEFAULT_TAGLINE = "The Prompt Operating System";
const DEFAULT_DESC =
  "Create, manage, optimize, and share professional AI prompts across all major AI platforms. Your command center for prompt engineering.";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = DEFAULT_NAME;
  let tagline = DEFAULT_TAGLINE;
  let description = DEFAULT_DESC;
  let logoUrl: string | null = null;
  let seoTitleTemplate: string | null = null;
  let seoKeywords: string | null = null;
  let ogImageUrl: string | null = null;
  let robotsIndex = true;
  let robotsFollow = true;

  try {
    const setting = await prisma.setting.findFirst();
    if (setting) {
      siteName = setting.siteName || siteName;
      tagline = setting.tagline || tagline;
      description = setting.siteDescription || description;
      logoUrl = setting.logoUrl;
      seoTitleTemplate = setting.seoTitleTemplate;
      seoKeywords = setting.seoKeywords;
      ogImageUrl = setting.ogImageUrl;
      robotsIndex = setting.robotsIndex;
      robotsFollow = setting.robotsFollow;
    }
  } catch {
    // DB unavailable (cold start / offline) — fall back to defaults
  }

  const title = `${siteName}${tagline ? ` — ${tagline}` : ""}`;
  const ogImage = ogImageUrl || logoUrl;
  const keywords = seoKeywords
    ? seoKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [
        "prompt",
        "AI",
        "ChatGPT",
        "Claude",
        "prompt engineering",
        "prompt management",
        "AI prompts",
      ];

  return {
    title: {
      default: title,
      template: seoTitleTemplate || `%s | ${siteName}`,
    },
    description,
    keywords,
    authors: [{ name: siteName }],
    creator: siteName,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName,
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage, alt: siteName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: {
      index: robotsIndex,
      follow: robotsFollow,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = "en";
  try {
    locale = (await getIntlLocale()) || "en";
  } catch {
    // locale unavailable (e.g. non-locale route) — fall back to English
  }
  let dir: "ltr" | "rtl" = "ltr";
  try {
    dir = (await getLanguageDirection(locale)) ?? getDirection(locale as never);
  } catch {
    dir = getDirection(locale as never);
  }

  return (
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          jetbrainsMono.variable,
          "min-h-screen bg-surface font-sans antialiased"
        )}
      >
        {children}
      </body>
    </html>
  );
}
