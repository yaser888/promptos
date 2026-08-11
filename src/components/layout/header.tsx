"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser } from "@/components/providers/auth-provider";
import { BrandLogo } from "@/components/ui/brand-logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  Menu,
  X,
  Layers,
  Store,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Newspaper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/library", label: "library", icon: Layers },
  { href: "/marketplace", label: "marketplace", icon: Store },
  { href: "/blog", label: "blog", icon: Newspaper },
  { href: "/pricing", label: "pricing", icon: CreditCard },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, user, isLoaded, signOut } = useAuthUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl border-b border-charcoal-800/50" />
      <Container>
        <div className="relative flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center group">
            <BrandLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all duration-200",
                    isActive
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(label)}
                </Link>
              );
            })}
            {isSignedIn && (
              <Link
                href="/dashboard"
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all duration-200",
                  pathname.startsWith("/dashboard")
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                {common("dashboard")}
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-800/50 border border-charcoal-800 text-sm text-charcoal-200 hover:border-emerald-500/30 transition-all"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                  <span className="max-w-[120px] truncate">{user?.name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sign-in">{t("login")}</Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link href="/sign-up">{t("register")}</Link>
                </Button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-b border-charcoal-800/50 bg-surface/95 backdrop-blur-xl"
          >
            <Container className="py-4 space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all",
                      isActive
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(label)}
                  </Link>
                );
              })}
              {isSignedIn && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50 transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {common("dashboard")}
                </Link>
              )}
              <Separator className="my-3" />
              <LanguageSwitcher fullWidth />
              {isSignedIn ? (
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setMobileOpen(false); handleSignOut(); }}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link href="/sign-in">{t("login")}</Link>
                  </Button>
                  <Button variant="primary" size="sm" className="w-full" asChild>
                    <Link href="/sign-up">{t("register")}</Link>
                  </Button>
                </>
              )}
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px bg-charcoal-800", className)} />;
}
