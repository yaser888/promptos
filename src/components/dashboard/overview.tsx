"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Eye,
  Copy,
  Heart,
  Sparkles,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalPrompts: number;
    totalViews: number;
    totalCopies: number;
    totalFavorites: number;
  };
  recentActivity: {
    action: string;
    detail: string;
    time: string;
  }[];
  popularPrompts: {
    rank: number;
    title: string;
    views: number;
    copies: number;
  }[];
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardOverview() {
  const t = useTranslations("dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/me/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} glass className="p-5">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-20" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card glass className="p-5">
            <Skeleton className="h-5 w-32 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-charcoal-800/50 last:border-0 last:pb-0">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
            ))}
          </Card>
          <Card glass className="p-5">
            <Skeleton className="h-5 w-32 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between pb-3 border-b border-charcoal-800/50 last:border-0 last:pb-0">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card glass className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-charcoal-300 mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const statsCards = [
    {
      title: t("stats.totalPrompts"),
      value: data.stats.totalPrompts.toLocaleString(),
      change: "Live",
      changeType: "positive" as const,
      icon: FileText,
      description: "Total prompts created",
    },
    {
      title: t("stats.totalViews"),
      value: data.stats.totalViews.toLocaleString(),
      change: "Live",
      changeType: "positive" as const,
      icon: Eye,
      description: "Total prompt views",
    },
    {
      title: t("stats.totalCopies"),
      value: data.stats.totalCopies.toLocaleString(),
      change: "Live",
      changeType: "positive" as const,
      icon: Copy,
      description: "Times prompts copied",
    },
    {
      title: t("stats.totalFavorites"),
      value: data.stats.totalFavorites.toLocaleString(),
      change: "Live",
      changeType: "neutral" as const,
      icon: Heart,
      description: "Saved to favorites",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">
            {t("overview")}
          </h1>
          <p className="text-charcoal-500 mt-1">
            Welcome back to your command center
          </p>
        </div>
        <Button variant="primary" asChild>
          <Link href="/dashboard/generator">
            <Sparkles className="h-4 w-4" />
            New Prompt
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card glass className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-charcoal-200">
                {t("stats.recentActivity")}
              </h2>
            </div>
            <Button variant="ghost" size="xs" asChild>
              <Link href="/dashboard/analytics">View All</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentActivity.length === 0 && (
              <p className="text-sm text-charcoal-500 text-center py-8">
                No activity yet — generate or copy a prompt to get started.
              </p>
            )}
            {data.recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-3 border-b border-charcoal-800/50 last:border-0 last:pb-0"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-charcoal-800 shrink-0">
                  <Activity className="h-4 w-4 text-charcoal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-charcoal-200">{item.action}</p>
                  {item.detail && (
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      {item.detail}
                    </p>
                  )}
                </div>
                <span className="text-xs text-charcoal-600 shrink-0">
                  {relativeTime(item.time)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card glass className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-charcoal-200">
                {t("stats.popularPrompts")}
              </h2>
            </div>
            <Button variant="ghost" size="xs" asChild>
              <Link href="/library">View All</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {data.popularPrompts.length === 0 && (
              <p className="text-sm text-charcoal-500 text-center py-8">
                No popular prompts yet.
              </p>
            )}
            {data.popularPrompts.map((prompt) => (
              <div
                key={prompt.rank}
                className="flex items-center justify-between pb-3 border-b border-charcoal-800/50 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-charcoal-600 w-5">
                    {String(prompt.rank).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm text-charcoal-200">{prompt.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-charcoal-600">
                        {prompt.views.toLocaleString()} views
                      </span>
                      <span className="text-xs text-charcoal-600">
                        {prompt.copies.toLocaleString()} copies
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">
                  #{prompt.rank}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
