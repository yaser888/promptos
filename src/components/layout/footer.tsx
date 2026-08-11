"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { BrandIcon } from "@/components/ui/brand-icon";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useBranding } from "@/components/providers/branding-provider";
import { useHomeContent } from "@/components/providers/home-content-provider";

interface SocialItem {
  id: string;
  label: string;
  url: string;
  icon: string;
}

const navColumns = [
  { key: "library", href: "/library" },
  { key: "marketplace", href: "/marketplace" },
  { key: "blog", href: "/blog" },
  { key: "pricing", href: "/pricing" },
];

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const branding = useBranding();
  const { pages } = useHomeContent();
  const [socials, setSocials] = useState<SocialItem[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/social-links", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.links) setSocials(json.links);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="border-t border-charcoal-800/50 bg-surface">
      <Container className="py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <Link href="/" className="flex items-center mb-4">
              <BrandLogo />
            </Link>
            <p className="text-sm text-charcoal-500 mb-6 max-w-xs">
              {branding.tagline || common("description")}
            </p>
            {socials.length > 0 && (
              <div className="flex items-center gap-3">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-charcoal-800 text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-700 transition-all"
                  >
                    <BrandIcon name={s.icon} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-charcoal-200 mb-4">
              {t("navigation")}
            </h3>
            <ul className="space-y-3">
              {navColumns.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-sm text-charcoal-500 hover:text-charcoal-300 transition-colors"
                  >
                    {nav(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-charcoal-200 mb-4">
              {t("pages")}
            </h3>
            <ul className="space-y-3">
              {pages.length === 0 && (
                <li className="text-sm text-charcoal-600">{t("noPages")}</li>
              )}
              {pages.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/pages/${p.slug}`}
                    className="text-sm text-charcoal-500 hover:text-charcoal-300 transition-colors"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-charcoal-200 mb-4">
              {t("support")}
            </h3>
            <ul className="space-y-3">
              {branding.supportEmail && (
                <li>
                  <a
                    href={`mailto:${branding.supportEmail}`}
                    className="text-sm text-charcoal-500 hover:text-charcoal-300 transition-colors"
                  >
                    {branding.supportEmail}
                  </a>
                </li>
              )}
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-charcoal-500 hover:text-charcoal-300 transition-colors"
                >
                  {common("dashboard")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-charcoal-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-charcoal-600">
            &copy; {new Date().getFullYear()} {branding.siteName || "PromptOS"}. {t("allRightsReserved")}
          </p>
        </div>
      </Container>
    </footer>
  );
}
