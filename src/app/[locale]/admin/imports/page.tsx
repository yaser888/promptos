"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle, Clock, XCircle, RefreshCw, Loader2, Search, Inbox } from "lucide-react";

interface ImportJob {
  id: string;
  sourceId: string;
  status: string;
  totalItems: number;
  importedItems: number;
  failedItems: number;
  errorLog: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  source: { id: string; name: string; type: string };
}

interface Source {
  id: string;
  name: string;
  type: string;
}

interface ImportsResponse {
  imports: ImportJob[];
  total: number;
}

const statusIcons: Record<string, "completed" | "failed" | "processing" | "pending"> = {
  COMPLETED: "completed",
  FAILED: "failed",
  PROCESSING: "processing",
  PENDING: "pending",
};

const statusKeys: Record<string, string> = {
  COMPLETED: "imports.statusCompleted",
  FAILED: "imports.statusFailed",
  PROCESSING: "imports.statusProcessing",
  PENDING: "imports.statusPending",
};

function relativeTime(dateStr: string, t: (key: string, values?: Record<string, string | number>) => string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("common.time.justNow");
  if (mins < 60) return t("common.time.minutesAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("common.time.hoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("common.time.daysAgo", { n: days });
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminImportsPage() {
  const t = useTranslations("adminPages");
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchImports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/imports?${params.toString()}`);
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data: ImportsResponse = await res.json();
      setImports(data.imports);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sources");
      if (!res.ok) return;
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      setSources([]);
    }
  }, []);

  useEffect(() => {
    fetchImports();
    fetchSources();
  }, [fetchImports, fetchSources]);

  const startImport = async (sourceId: string) => {
    setCreating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("imports.importStarted"));
      fetchImports();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("imports.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("imports.subtitle", { total })}</p>
        </div>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <select
              onChange={(e) => e.target.value && startImport(e.target.value)}
              value=""
              className="flex h-9 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-200 focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="" disabled>
                {creating ? t("imports.starting") : t("imports.startFromSource")}
              </option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <Button variant="primary" disabled={creating || sources.length === 0}>
            <Upload className="h-4 w-4" />
            {t("imports.newImport")}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("imports.searchBySource")}
          className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
        </div>
      )}

      {error && !loading && (
        <Card glass className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-charcoal-300 mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchImports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.tryAgain")}
          </Button>
        </Card>
      )}

      {!loading && !error && imports.length === 0 && (
        <Card glass className="p-8 text-center">
          <Inbox className="h-10 w-10 text-charcoal-600 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">{t("imports.noJobs")}</p>
          <p className="text-charcoal-500 text-sm">{t("imports.noJobsHint")}</p>
        </Card>
      )}

      <div className="space-y-3">
        {imports.map((imp) => {
          const icon = statusIcons[imp.status] || "pending";
          const className =
            imp.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
            imp.status === "FAILED" ? "bg-red-500/10 text-red-400" :
            imp.status === "PROCESSING" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400";
          const pct = imp.totalItems > 0 ? Math.round((imp.importedItems / imp.totalItems) * 100) : 0;
          return (
            <Card key={imp.id} glass hover className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    icon === "completed" ? "bg-emerald-500/10" :
                    icon === "failed" ? "bg-red-500/10" :
                    icon === "processing" ? "bg-amber-500/10" : "bg-blue-500/10"
                  }`}>
                    {icon === "completed" && <CheckCircle className="h-5 w-5 text-emerald-400" />}
                    {icon === "failed" && <XCircle className="h-5 w-5 text-red-400" />}
                    {icon === "processing" && <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />}
                    {icon === "pending" && <Clock className="h-5 w-5 text-blue-400" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal-200">{imp.source.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="default" size="sm">{imp.source.type}</Badge>
                      <span className="text-xs text-charcoal-600">{relativeTime(imp.createdAt, t)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-end">
                    <p className="text-sm text-charcoal-400">
                      {t("imports.items", { imported: imp.importedItems, total: imp.totalItems })}
                    </p>
                    {imp.failedItems > 0 && (
                      <p className="text-xs text-red-400">{t("imports.failed", { failed: imp.failedItems })}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${className}`}>
                    {t(statusKeys[imp.status] || "imports.statusPending")}
                  </span>
                </div>
              </div>
              {imp.totalItems > 0 && (
                <div className="mt-3 pt-3 border-t border-charcoal-800/50">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-charcoal-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-charcoal-600">{pct}%</span>
                  </div>
                </div>
              )}
              {imp.errorLog && (
                <p className="mt-2 text-xs text-red-400/80 line-clamp-2">{imp.errorLog}</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
