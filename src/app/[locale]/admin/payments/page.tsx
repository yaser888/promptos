"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, MoreHorizontal, RefreshCw, AlertCircle, TrendingUp, Receipt, Calculator } from "lucide-react";

interface Payment {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  plan: string;
  status: string;
  amount: number;
  createdAt: string;
}

interface PaymentsResponse {
  payments: Payment[];
  totalRevenue: number;
  totalCount: number;
  revenueTimeline: { date: string; revenue: number }[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusColors: Record<string, string> = {
  Paid: "bg-emerald-500/10 text-emerald-400",
  Pending: "bg-amber-500/10 text-amber-400",
  Failed: "bg-red-500/10 text-red-400",
  Refunded: "bg-blue-500/10 text-blue-400",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AdminPaymentsPage() {
  const t = useTranslations("adminPages");
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const mountedRef = useRef(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error(`${t("common.somethingWentWrong")}: ${res.statusText}`);
      const json: PaymentsResponse = await res.json();
      if (mountedRef.current) setData(json);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [debouncedSearch, t]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPayments();
    return () => { mountedRef.current = false; };
  }, [fetchPayments]);

  const avgRevenue = data && data.totalCount > 0 ? data.totalRevenue / data.totalCount : 0;

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["ID", "Customer", "Email", "Plan", "Amount (USD)", "Status", "Date"],
      ...data.payments.map((p) => [
        p.id,
        p.customerName,
        p.customerEmail,
        p.plan,
        p.amount.toFixed(2),
        p.status,
        new Date(p.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promptos-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("payments.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("payments.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchPayments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!data || data.payments.length === 0}>
            <DollarSign className="h-4 w-4" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} glass className="p-5 animate-pulse">
              <div className="h-4 w-24 rounded bg-charcoal-700 mb-3" />
              <div className="h-8 w-32 rounded bg-charcoal-700 mb-2" />
              <div className="h-3 w-20 rounded bg-charcoal-700" />
            </Card>
          ))}
        </div>
      )}

      {data && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card glass className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-charcoal-500">{t("payments.totalRevenue")}</p>
            </div>
            <p className="text-2xl font-bold text-charcoal-100">{formatCurrency(data.totalRevenue)}</p>
            <span className="text-xs text-charcoal-500 mt-1 block">{t("payments.paymentsTotal", { count: data.totalCount })}</span>
          </Card>
          <Card glass className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-blue-400" />
              <p className="text-sm text-charcoal-500">{t("payments.totalPayments")}</p>
            </div>
            <p className="text-2xl font-bold text-charcoal-100">{data.totalCount}</p>
          </Card>
          <Card glass className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-purple-400" />
              <p className="text-sm text-charcoal-500">{t("payments.avgRevenue")}</p>
            </div>
            <p className="text-2xl font-bold text-charcoal-100">{formatCurrency(avgRevenue)}</p>
          </Card>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
        <input
          placeholder={t("payments.search")}
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
          <Button variant="secondary" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.tryAgain")}
          </Button>
        </Card>
      )}

      {!loading && !error && data && data.payments.length === 0 && (
        <Card glass className="p-8 text-center">
          <Receipt className="h-10 w-10 text-charcoal-600 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">{t("payments.noPayments")}</p>
          <p className="text-charcoal-500 text-sm">{t("payments.noPaymentsHint")}</p>
        </Card>
      )}

      {data && data.payments.length > 0 && (
        <Card glass className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal-800/50">
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("payments.colUser")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("payments.colPlan")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("payments.colAmount")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("payments.colStatus")}</th>
                  <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("payments.colDate")}</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-charcoal-800/30 hover:bg-charcoal-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-800 text-xs text-charcoal-400 shrink-0">
                          {payment.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-charcoal-200">{payment.customerName}</p>
                          <p className="text-xs text-charcoal-500">{payment.customerEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={payment.plan === "Pro" || payment.plan === "Team" ? "emerald" : "default"} size="sm">{payment.plan}</Badge>
                    </td>
                    <td className="px-4 py-3 text-charcoal-200 font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[payment.status] || "bg-charcoal-800 text-charcoal-500"}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal-500 text-xs whitespace-nowrap">{formatDate(payment.createdAt)}</td>
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
