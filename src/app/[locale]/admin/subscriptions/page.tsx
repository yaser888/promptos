"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, CreditCard, MoreHorizontal, Users, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

interface SubscriptionUser {
  name: string;
  email: string;
}

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeCustomerId: string;
  createdAt: string;
  user: SubscriptionUser;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
}

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400",
  Trialing: "bg-blue-500/10 text-blue-400",
  Canceled: "bg-charcoal-600/50 text-charcoal-400",
  Expired: "bg-red-500/10 text-red-400",
  PastDue: "bg-amber-500/10 text-amber-400",
};

const planVariants: Record<string, "emerald" | "blue" | "purple" | "default"> = {
  Free: "default",
  Pro: "emerald",
  Team: "blue",
  Enterprise: "purple",
};

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AdminSubscriptionsPage() {
  const t = useTranslations("adminPages");
  const [data, setData] = useState<SubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const debouncedSearch = useDebounce(search, 300);
  const mountedRef = useRef(true);

  const planOptions = ["All", "PRO", "TEAM", "ENTERPRISE"];

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (planFilter !== "All") params.set("plan", planFilter);
      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (!res.ok) throw new Error(`${t("common.somethingWentWrong")}: ${res.statusText}`);
      const json: SubscriptionsResponse = await res.json();
      if (mountedRef.current) setData(json);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [debouncedSearch, planFilter, t]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSubscriptions();
    return () => { mountedRef.current = false; };
  }, [fetchSubscriptions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("subscriptions.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("subscriptions.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchSubscriptions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
          <div className="flex items-center gap-1.5">
            {planOptions.map((p) => (
              <Button
                key={p}
                variant={planFilter === p ? "primary" : "secondary"}
                size="sm"
                onClick={() => setPlanFilter(p)}
              >
                {p === "All" ? <Users className="h-4 w-4 mr-1" /> : null}
                {p}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
        <input
          placeholder={t("subscriptions.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {loading && !data && (
        <Card glass className="overflow-hidden p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-charcoal-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-charcoal-700" />
                <div className="h-3 w-1/4 rounded bg-charcoal-700" />
              </div>
              <div className="h-5 w-16 rounded bg-charcoal-700" />
              <div className="h-5 w-20 rounded bg-charcoal-700" />
            </div>
          ))}
        </Card>
      )}

      {error && (
        <Card glass className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-charcoal-300 mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchSubscriptions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.tryAgain")}
          </Button>
        </Card>
      )}

      {!loading && !error && data && data.subscriptions.length === 0 && (
        <Card glass className="p-8 text-center">
          <Users className="h-10 w-10 text-charcoal-600 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">{t("subscriptions.noSubs")}</p>
          <p className="text-charcoal-500 text-sm">{t("subscriptions.noSubsHint")}</p>
        </Card>
      )}

      {data && data.subscriptions.length > 0 && (
        <Card glass className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal-800/50">
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("subscriptions.colUser")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("subscriptions.colPlan")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("subscriptions.colStatus")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("subscriptions.colPeriodStart")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("subscriptions.colPeriodEnd")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("subscriptions.colCreated")}</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-charcoal-800/30 hover:bg-charcoal-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-800 text-xs text-charcoal-400 shrink-0">
                          {sub.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-charcoal-200">{sub.user.name}</p>
                          <p className="text-xs text-charcoal-500">{sub.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={planVariants[sub.plan] || "default"} size="sm">{sub.plan}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[sub.status] || "bg-charcoal-800 text-charcoal-500"}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal-500 text-xs whitespace-nowrap">{formatDate(sub.currentPeriodStart)}</td>
                    <td className="px-4 py-3 text-charcoal-500 text-xs whitespace-nowrap">{formatDate(sub.currentPeriodEnd)}</td>
                    <td className="px-4 py-3 text-charcoal-500 text-xs whitespace-nowrap">{formatDate(sub.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
