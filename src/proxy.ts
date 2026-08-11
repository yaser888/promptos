import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { defaultLocale } from "@/i18n/config";
import { getLanguageRegistry, BUILTIN_LANGUAGES } from "@/lib/site-languages";
import type { SiteLanguageRecord } from "@/lib/site-languages";

const publicPatterns = [
  /^$/,
  /^\/sign-in(\/.*)?$/,
  /^\/sign-up(\/.*)?$/,
  /^\/api(\/.*)?$/,
  /^\/_next(\/.*)?$/,
  /^\/favicon\.ico$/,
  /^\/uploads(\/.*)?$/,
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
  /^\/manifest\.json$/,
  /^\/embed(\/.*)?$/,
  /^\/prompts(\/.*)?$/,
  /^\/pages(\/.*)?$/,
  /^\/marketplace(\/.*)?$/,
  /^\/pricing(\/.*)?$/,
  /^\/library(\/.*)?$/,
  /^\/blog(\/.*)?$/,
  /^\/editor(\/.*)?$/,
  /^\/$/, // root homepage
];

function isPublicPath(pathname: string, prefixPattern: RegExp): boolean {
  const path = pathname.replace(prefixPattern, "");
  return publicPatterns.some((pattern) => pattern.test(path));
}

function hasDemoSession(req: NextRequest): boolean {
  return (req.cookies.get("promptos_demo_session")?.value?.length ?? 0) > 0;
}

export default clerkMiddleware(
  async (auth, req: NextRequest) => {
    const { userId } = await auth();
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
      return NextResponse.next();
    }

    let registry: SiteLanguageRecord[];
    try {
      registry = await getLanguageRegistry();
    } catch {
      registry = BUILTIN_LANGUAGES;
    }
    const knownCodes = registry.map((l) => l.code);
    const enabledCodes = registry.filter((l) => l.enabled).map((l) => l.code);

    const prefixPattern = new RegExp(`^/(${knownCodes.join("|")})(?=/|$)`);
    const matchedPrefix = pathname.match(prefixPattern)?.[1];

    if (matchedPrefix && !enabledCodes.includes(matchedPrefix)) {
      const target = pathname.replace(prefixPattern, "") || "/";
      return NextResponse.redirect(new URL(target, req.url));
    }

    const demoMode = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const isAuthenticated = demoMode ? hasDemoSession(req) : !!userId;

    if (!isPublicPath(pathname, prefixPattern) && !isAuthenticated) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    return createIntlMiddleware({
      locales: enabledCodes,
      defaultLocale,
      localePrefix: "as-needed",
      localeDetection: false,
    })(req);
  },
  {
    signInUrl: "/sign-in",
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|sitemap.xml|robots.txt).*)",
    "/(api|trpc)(.*)",
  ],
};