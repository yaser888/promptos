import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { BrandingProvider } from "@/components/providers/branding-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { HomeContentProvider } from "@/components/providers/home-content-provider";
import { AdminKeybind } from "@/components/providers/admin-keybind";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-auth";
import { runHeadHooks, runBodyHooks } from "@/engine/extensions/runtime";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  let maintenanceMode = false;
  try {
    const settings = await prisma.setting.findFirst();
    maintenanceMode = settings?.maintenanceMode ?? false;
  } catch {
    // DB unavailable — serve the site normally
  }

  if (maintenanceMode) {
    const session = await getServerSession().catch(() => null);
    const isAdmin = session?.user?.role === "ADMIN";
    if (!isAdmin) {
      const m = (messages as any).maintenancePage || {
        title: "We'll be back soon",
        description: "The site is currently under maintenance. Please check back shortly.",
      };
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">🛠️</div>
          <h1 className="text-2xl font-bold text-charcoal-100 mb-2">{m.title}</h1>
          <p className="text-charcoal-500 max-w-md">{m.description}</p>
        </div>
      );
    }
  }

  const headSnippets = await runHeadHooks().catch(() => []);
  const bodySnippets = await runBodyHooks().catch(() => []);

  return (
    <AuthProvider>
      <BrandingProvider>
        <ThemeProvider>
          <HomeContentProvider>
            <ToastProvider>
              <NextIntlClientProvider locale={locale} messages={messages}>
                {headSnippets.map((snippet, i) => (
                  <div
                    key={`ext-head-${i}`}
                    dangerouslySetInnerHTML={{ __html: snippet }}
                    suppressHydrationWarning
                  />
                ))}
                {children}
                {bodySnippets.map((snippet, i) => (
                  <div
                    key={`ext-body-${i}`}
                    dangerouslySetInnerHTML={{ __html: snippet }}
                    suppressHydrationWarning
                  />
                ))}
                <AdminKeybind />
                <Analytics />
                <SpeedInsights />
              </NextIntlClientProvider>
            </ToastProvider>
          </HomeContentProvider>
        </ThemeProvider>
      </BrandingProvider>
    </AuthProvider>
  );
}
