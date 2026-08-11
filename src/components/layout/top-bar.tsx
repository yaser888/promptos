"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthUser } from "@/components/providers/auth-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({ showDashboardLink = false }: { showDashboardLink?: boolean }) {
  const { user, signOut } = useAuthUser();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-30 border-b border-charcoal-800/50 bg-surface/80 backdrop-blur-xl px-4 h-14 shrink-0">
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-charcoal-500 truncate">
          {showDashboardLink && !isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" className="truncate">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin" className="truncate">
                <LayoutDashboard className="h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-charcoal-800/50 bg-charcoal-900/60 px-3 py-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
            <span className="max-w-[110px] truncate text-xs text-charcoal-300">
              {user?.name || "Guest"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isAdmin ? "Logout" : "Sign out"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}