"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderTree,
  Database,
  Upload,
  CreditCard,
  BadgeDollarSign,
  DollarSign,
  Wallet,
  Palette,
  Settings,
  PanelRightOpen,
  Newspaper,
  ServerCog,
  PanelsTopLeft,
  Home,
  Share2,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";

const adminLinks = [
  { href: "/admin", label: "overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "users", icon: Users },
  { href: "/admin/prompts", label: "prompts", icon: FileText },
  { href: "/admin/categories", label: "categories", icon: FolderTree },
  { href: "/admin/sources", label: "sources", icon: Database },
  { href: "/admin/imports", label: "imports", icon: Upload },
  { href: "/admin/subscriptions", label: "subscriptions", icon: CreditCard },
  { href: "/admin/plans", label: "plans", icon: BadgeDollarSign },
  { href: "/admin/payments", label: "payments", icon: DollarSign },
  { href: "/admin/payment-methods", label: "paymentMethods", icon: Wallet },
  { href: "/admin/branding", label: "branding", icon: Palette },
  { href: "/admin/home", label: "home", icon: Home },
  { href: "/admin/social-links", label: "socialLinks", icon: Share2 },
  { href: "/admin/blog", label: "blog", icon: Newspaper },
  { href: "/admin/pages", label: "pages", icon: PanelsTopLeft },
  { href: "/admin/system", label: "system", icon: ServerCog },
  { href: "/admin/settings", label: "settings", icon: Settings },
];

export function AdminSidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed start-0 top-0 border-e border-charcoal-800/50 bg-surface z-50">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-charcoal-800/50">
        <Link href="/admin" className="flex items-center">
          <BrandLogo sub="Admin" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {adminLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(label)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-charcoal-800/50 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg text-charcoal-500 hover:text-charcoal-300 hover:bg-charcoal-800/50 transition-all"
        >
          <PanelRightOpen className="h-4 w-4" />
          {t("backToDashboard")}
        </Link>
      </div>
    </aside>
  );
}
