"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/stats-card";
import { FileText, Copy, Share2, Sparkles, Clock, Activity } from "lucide-react";

interface HourlyBreakdown {
  hour: number;
  count: number;
}

interface UsageStats {
  totalPrompts: number;
  totalCopies: number;
  totalShares: number;
  totalGenerates: number;
  recentActivity: {
    id: string;
    action: string;
    metadata: any;
    createdAt: string;
  }[];
}

interface UsageResponse {
  stats: UsageStats;
  dailyUsage: HourlyBreakdown[];
}

const actionLabels: Record<string, string> = {
  PROMPT_CREATE: "Created prompt",
  PROMPT_COPY: "Copied prompt",
  PROMPT_SHARE: "Shared prompt",
  PROMPT_GENERATE: "Generated prompt",
  PROMPT_OPTIMIZE: "Optimized prompt",
  PROMPT_ANALYZE: "Analyzed prompt",
  PROMPT_TRANSLATE: "Translated prompt",
  FAVORITE_ADD: "Added to favorites",
  FAVORITE_REMOVE: "Removed from favorites",
  COLLECTION_CREATE: "Created collection",
};

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
            <Skeleton className="h-10 w-10 rounded-lg mb-3" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card glass className="p-6">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="flex items-end justify-between gap-1 h-40">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <Skeleton className="w-full rounded-t-md h-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card glass className="p-6">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between pb-3 border-b border-charcoal-800/50 last:border-0">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-full bg-red-500/10 p-3 mb-4">
        <Activity className="h-6 w-6 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-charcoal-200 mb-1">Failed to load usage</h2>
      <p className="text-sm text-charcoal-500 mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations("dashboard");
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/usage")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch usage data");
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
    fetchUsage();
  }, [fetchUsage]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchUsage} />;
  if (!data) return null;

  const { stats } = data;
  const breakdown = data.dailyUsage;
  const maxCount = breakdown.length > 0 ? Math.max(...breakdown.map((d) => d.count), 1) : 1;
  const totalToday = breakdown.reduce((sum, d) => sum + d.count, 0);
  const recent = stats.recentActivity.slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-100">Analytics</h1>
        <p className="text-charcoal-500 mt-1">
          Track your prompt usage and performance
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t("stats.totalPrompts")}
          value={stats.totalPrompts.toLocaleString()}
          icon={FileText}
          description="Prompts created"
        />
        <StatsCard
          title="Prompts Copied"
          value={stats.totalCopies.toLocaleString()}
          icon={Copy}
          description="Times copied"
        />
        <StatsCard
          title="Prompts Shared"
          value={stats.totalShares.toLocaleString()}
          icon={Share2}
          description="Times shared"
        />
        <StatsCard
          title="Generations"
          value={stats.totalGenerates.toLocaleString()}
          icon={Sparkles}
          description="AI generations"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card glass className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-charcoal-200">Today&apos;s Activity</h2>
            </div>
            <span className="text-xs text-charcoal-500">{totalToday} events</span>
          </div>
          {breakdown.length === 0 || totalToday === 0 ? (
            <div className="flex items-center justify-center h-40 text-charcoal-500 text-sm">
              No activity today — generate or copy a prompt.
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-1 h-40">
                {breakdown.map((hour) => (
                  <div key={hour.hour} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <span className="text-[10px] text-charcoal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {hour.count}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-emerald-500/20 hover:bg-emerald-500/40 transition-all"
                      style={{
                        height: `${(hour.count / maxCount) * 100}%`,
                        minHeight: hour.count > 0 ? "4px" : "0px",
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-charcoal-600">00:00</span>
                <span className="text-xs text-charcoal-600">Now</span>
              </div>
            </>
          )}
        </Card>

        <Card glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-charcoal-200">Recent Activity</h2>
            </div>
          </div>
          <div className="space-y-3">
            {recent.length === 0 && (
              <p className="text-sm text-charcoal-500 text-center py-8">
                No activity yet.
              </p>
            )}
            {recent.map((item) => (
              <div key={item.id} className="flex items-center justify-between pb-3 border-b border-charcoal-800/50 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm text-charcoal-200">
                    {actionLabels[item.action] || item.action}
                  </p>
                  {item.metadata?.title && (
                    <p className="text-xs text-charcoal-500 mt-0.5">{item.metadata.title}</p>
                  )}
                </div>
                <span className="text-xs text-charcoal-600 shrink-0 ml-3">
                  {relativeTime(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
