"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FileText,
  CreditCard,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { SystemCenter } from "@/components/admin/system-center";

interface RecentUser {
  name: string;
  email: string;
  createdAt: string;
  role: string;
  subscription: { plan: string; status: string } | null;
}

interface PlanBreakdownItem {
  plan: string;
  _count: number;
}

interface AdminStats {
  totalUsers: number;
  totalPrompts: number;
  activeSubscriptions: number;
  estimatedRevenue: number;
  promptsLastWeek: number;
  usersLastWeek: number;
  recentUsers: RecentUser[];
  planBreakdown: PlanBreakdownItem[];
  weeklyActivity: { labels: string[]; counts: number[] };
}

function relativeTime(dateStr: string, t: (key: string, values?: Record<string, string | number>) => string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return t("common.time.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("common.time.minAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(hours > 1 ? "common.time.hoursAgo" : "common.time.hourAgo", { n: hours });
  const days = Math.floor(hours / 24);
  return t(days > 1 ? "common.time.daysAgo" : "common.time.dayAgo", { n: days });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} glass className="p-5">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card glass className="p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between pb-3 border-b border-charcoal-800/50">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
        <Card glass className="p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="flex items-end justify-between gap-2 h-40">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <Skeleton className="w-full rounded-t-md h-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry, t }: { message: string; onRetry: () => void; t: (key: string, values?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-full bg-red-500/10 p-3 mb-4">
        <Activity className="h-6 w-6 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-charcoal-200 mb-1">{t("overview.failedToLoad")}</h2>
      <p className="text-sm text-charcoal-500 mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>{t("common.tryAgain")}</Button>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("adminPages");
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-full bg-charcoal-800 p-3 mb-4">
        <Activity className="h-6 w-6 text-charcoal-500" />
      </div>
      <h2 className="text-lg font-semibold text-charcoal-200 mb-1">{t("overview.noData")}</h2>
      <p className="text-sm text-charcoal-500">{t("common.noData")}</p>
    </div>
  );
}

export default function AdminPage() {
  const t = useTranslations("adminPages");
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchStats = useCallback(() => {
    let attempts = 0;
    const run = () => {
      if (!mountedRef.current) return;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      setLoading(true);
      setError(null);
      fetch("/api/admin/stats", { signal: controller.signal, cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch stats");
          return res.json();
        })
        .then((json) => {
          clearTimeout(timer);
          if (!mountedRef.current) return;
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          clearTimeout(timer);
          if (!mountedRef.current) return;
          attempts++;
          if (attempts < 3) {
            setTimeout(run, 700 * attempts);
          } else {
            setError(err.message || "Failed to fetch stats");
            setLoading(false);
          }
        });
    };
    run();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchStats} t={t} />;
  if (!data) return <EmptyState />;

  const userPct = Math.round((data.usersLastWeek / Math.max(data.totalUsers, 1)) * 100);
  const promptPct = Math.round((data.promptsLastWeek / Math.max(data.totalPrompts, 1)) * 100);

  const statsCards = [
    {
      label: "overview.totalUsers",
      value: data.totalUsers.toLocaleString(),
      change: `+${userPct}%`,
      icon: Users,
      color: "blue" as const,
    },
    {
      label: "overview.totalPrompts",
      value: data.totalPrompts.toLocaleString(),
      change: `+${promptPct}%`,
      icon: FileText,
      color: "emerald" as const,
    },
    {
      label: "overview.activeSubscriptions",
      value: data.activeSubscriptions.toLocaleString(),
      change: data.activeSubscriptions.toLocaleString(),
      icon: CreditCard,
      color: "amber" as const,
    },
    {
      label: "overview.revenue",
      value: `$${data.estimatedRevenue.toLocaleString()}`,
      change: `$${data.estimatedRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "emerald" as const,
    },
  ];

  const weeklyCounts = data.weeklyActivity?.counts?.length
    ? data.weeklyActivity.counts
    : Array(7).fill(0);
  const weeklyLabels = data.weeklyActivity?.labels?.length
    ? data.weeklyActivity.labels
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxVal = Math.max(...weeklyCounts, 1);
  const totalPlanSubs = data.planBreakdown.reduce((sum, p) => sum + p._count, 0) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-100">{t("overview.title")}</h1>
        <p className="text-charcoal-500 mt-1">{t("overview.subtitle")}</p>
      </div>

      <SystemCenter />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label} glass hover className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  stat.color === "blue" && "bg-blue-500/10",
                  stat.color === "emerald" && "bg-emerald-500/10",
                  stat.color === "amber" && "bg-amber-500/10"
                )}
              >
                <stat.icon
                  className={cn(
                    "h-5 w-5",
                    stat.color === "blue" && "text-blue-400",
                    stat.color === "emerald" && "text-emerald-400",
                    stat.color === "amber" && "text-amber-400"
                  )}
                />
              </div>
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-charcoal-100">{stat.value}</p>
            <p className="text-sm text-charcoal-500 mt-1">{t(stat.label)}</p>
          </Card>
        ))}
      </div>

      <Card glass className="p-5">
        <h2 className="text-sm font-semibold text-charcoal-200 mb-4">{t("overview.planBreakdown")}</h2>
        <div className="flex items-end gap-2">
          {data.planBreakdown.map((item) => {
            const pct = Math.round((item._count / totalPlanSubs) * 100);
            return (
              <div key={item.plan} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-charcoal-500">{item._count}</span>
                <div
                  className="w-full rounded-t-md bg-emerald-500/20 transition-all"
                  style={{ height: `${Math.max(pct, 4)}px` }}
                />
                <span className="text-xs text-charcoal-600 uppercase">{item.plan}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card glass className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-charcoal-200">{t("overview.recentUsers")}</h2>
            </div>
            <Button variant="ghost" size="xs" asChild>
              <Link href="/admin/users">{t("overview.viewAll")}</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-charcoal-500 text-center py-8">{t("overview.noRecentUsers")}</p>
            ) : (
              data.recentUsers.map((user, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between pb-3 border-b border-charcoal-800/50 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-800 text-xs text-charcoal-400">
                      {user.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm text-charcoal-200">{user.name || t("overview.unknown")}</p>
                      <p className="text-xs text-charcoal-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-charcoal-500">
                      {user.subscription?.plan || t("overview.free")}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        user.subscription?.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-charcoal-800 text-charcoal-500"
                      )}
                    >
                      {user.subscription?.status === "ACTIVE" ? t("common.active") : t("common.inactive")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card glass className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-charcoal-200">{t("overview.weeklyActivity")}</h2>
            </div>
            <span className="text-xs text-charcoal-500">
              {data.promptsLastWeek.toLocaleString()} {t("overview.prompts")}
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {weeklyCounts.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-xs text-charcoal-500">{val}</span>
                <div
                  className="w-full rounded-t-md bg-emerald-500/20 hover:bg-emerald-500/30 transition-all"
                  style={{ height: `${(val / maxVal) * 100}%` }}
                />
                <span className="text-xs text-charcoal-600">{weeklyLabels[i]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
