"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  FileText,
  Heart,
  FolderOpen,
  Settings,
  Sparkles,
  BarChart3,
  CreditCard,
  Wand2,
  Bot,
} from "lucide-react";
import { useAuthUser } from "@/components/providers/auth-provider";
import { BrandLogo } from "@/components/ui/brand-logo";

const sidebarLinks = [
  { href: "/dashboard", label: "overview", icon: LayoutDashboard },
  { href: "/dashboard/generator", label: "generator", icon: Sparkles },
  { href: "/dashboard/prompt-doctor", label: "promptDoctor", icon: Wand2 },
  { href: "/dashboard/autopilot", label: "autopilot", icon: Bot },
  { href: "/dashboard/prompts", label: "myPrompts", icon: FileText },
  { href: "/dashboard/favorites", label: "favorites", icon: Heart },
  { href: "/dashboard/collections", label: "collections", icon: FolderOpen },
  { href: "/dashboard/analytics", label: "usage", icon: BarChart3 },
  { href: "/dashboard/subscription", label: "subscription", icon: CreditCard },
  { href: "/dashboard/settings", label: "settings", icon: Settings },
];

export function DashboardSidebar() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const { user } = useAuthUser();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed start-0 top-0 border-e border-charcoal-800/50 bg-surface">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-charcoal-800/50">
        <Link href="/" className="flex items-center">
          <BrandLogo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {sidebarLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
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

      <div className="p-4 border-t border-charcoal-800/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-charcoal-200 truncate">
              {user?.name || "Guest"}
            </p>
            <p className="text-xs text-charcoal-500 truncate">
              {user?.email || "Demo mode"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
