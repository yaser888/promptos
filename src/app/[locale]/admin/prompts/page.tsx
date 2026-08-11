"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, MoreHorizontal, Eye, Trash2, ToggleLeft, RefreshCw, AlertCircle, Inbox, Loader2 } from "lucide-react";

interface PromptUser {
  name: string;
  email: string;
}

interface PromptCategory {
  name: string;
}

interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string;
  platform: string;
  status?: string;
  isPublic: boolean;
  isFeatured: boolean;
  isFlagged: boolean;
  viewCount: number;
  copyCount: number;
  category: PromptCategory;
  user: PromptUser;
  createdAt: string;
  isDeleted: boolean;
}

interface ApiResponse {
  prompts: Prompt[];
  total: number;
}

function getStatusInfo(p: Prompt, t: (key: string, values?: Record<string, string | number>) => string): { label: string; className: string } {
  if (p.isFlagged) return { label: t("prompts.statusFlagged"), className: "bg-red-500/10 text-red-400" };
  if (p.isDeleted) return { label: t("prompts.statusDeleted"), className: "bg-charcoal-800 text-charcoal-500" };
  if (!p.content) return { label: t("prompts.statusDraft"), className: "bg-charcoal-800 text-charcoal-500" };
  if (p.status === "published") return { label: t("prompts.statusPublished"), className: "bg-emerald-500/10 text-emerald-400" };
  if (!p.status) {
    return {
      label: p.isPublic ? t("prompts.statusPublished") : t("prompts.statusPrivate"),
      className: p.isPublic ? "bg-emerald-500/10 text-emerald-400" : "bg-charcoal-800 text-charcoal-500",
    };
  }
  return { label: p.status.charAt(0).toUpperCase() + p.status.slice(1), className: "bg-charcoal-800 text-charcoal-500" };
}

function SkeletonRow() {
  return (
    <tr className="border-b border-charcoal-800/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-charcoal-800 animate-pulse" />
          <div className="h-4 w-48 bg-charcoal-800 rounded animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-4 w-28 bg-charcoal-800 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 bg-charcoal-800 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-12 bg-charcoal-800 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-12 bg-charcoal-800 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-charcoal-800 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3"><div className="flex gap-1"><div className="h-7 w-7 bg-charcoal-800 rounded-lg animate-pulse" /></div></td>
    </tr>
  );
}

export default function AdminPromptsPage() {
  const t = useTranslations("adminPages");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = [
    { value: "all", label: t("prompts.allStatus") },
    { value: "featured", label: t("prompts.featured") },
    { value: "flagged", label: t("prompts.statusFlagged") },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/prompts?${params}`);
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data: ApiResponse = await res.json();
      setPrompts(data.prompts);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const runBulk = async (action: "clean-titles" | "clean-content" | "dedupe" = "clean-titles") => {
    setBulkLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/prompts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      const data = await res.json();
      if (action === "clean-titles") {
        setNotice(data.cleaned > 0 ? t("prompts.cleanedTitles", { n: data.cleaned }) : t("prompts.titlesClean"));
      } else if (action === "clean-content") {
        setNotice(data.cleaned > 0 ? t("prompts.cleanedContents", { n: data.cleaned }) : t("prompts.contentsClean"));
      } else {
        setNotice(data.deleted > 0 ? t("prompts.removedDuplicates", { n: data.deleted }) : t("prompts.noDuplicates"));
      }
      await fetchPrompts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBulkLoading(false);
    }
  };

  const runAction = async (
    id: string,
    method: "PATCH" | "DELETE",
    action: "toggle-featured" | "toggle-flag" | "delete",
    successMsg: string
  ) => {
    setActionLoading(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/prompts`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(successMsg);
      await fetchPrompts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFeatured = (p: Prompt) =>
    runAction(p.id, "PATCH", "toggle-featured", p.isFeatured ? t("prompts.removedFromFeatured") : t("prompts.featuredNow"));

  const deletePrompt = (p: Prompt) =>
    runAction(p.id, "DELETE", "delete", t("prompts.promptDeleted"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("prompts.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("prompts.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkLoading}
            onClick={() => runBulk("clean-titles")}
          >
            <Loader2 className={`h-3.5 w-3.5 mr-1.5 ${bulkLoading ? "animate-spin" : ""}`} />
            {t("prompts.cleanTitles")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkLoading}
            onClick={() => runBulk("clean-content")}
          >
            <Loader2 className={`h-3.5 w-3.5 mr-1.5 ${bulkLoading ? "animate-spin" : ""}`} />
            {t("prompts.cleanContent")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkLoading}
            onClick={() => runBulk("dedupe")}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {t("prompts.removeDuplicates")}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
          <input
            placeholder={t("prompts.search")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "primary" : "secondary"}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Card glass className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-800/50">
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("prompts.colPrompt")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("prompts.colAuthor")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("prompts.colPlatform")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("prompts.colViews")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("prompts.colCopies")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("common.status")}</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
                    <p className="text-charcoal-300 mt-2">{error}</p>
                    <Button variant="secondary" size="sm" onClick={fetchPrompts} className="mt-3">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("common.tryAgain")}
                    </Button>
                  </td>
                </tr>
              ) : prompts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Inbox className="mx-auto h-8 w-8 text-charcoal-500" />
                    <p className="text-charcoal-400 mt-2">{t("prompts.noPrompts")}</p>
                  </td>
                </tr>
              ) : (
                prompts.map((prompt) => {
                  const status = getStatusInfo(prompt, t);
                  return (
                    <tr key={prompt.id} className="border-b border-charcoal-800/30 hover:bg-charcoal-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                            <FileText className="h-4 w-4 text-emerald-400" />
                          </div>
                          <span className="text-sm text-charcoal-200">{prompt.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-charcoal-400">{prompt.user.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="default" size="sm">{prompt.platform}</Badge>
                      </td>
                      <td className="px-4 py-3 text-charcoal-400">{prompt.viewCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-charcoal-400">{prompt.copyCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => window.open(`/prompts/${prompt.id}`, "_blank")}
                            className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
                            title={t("common.viewPrompt")}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => toggleFeatured(prompt)}
                            disabled={actionLoading === prompt.id}
                            className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                            title={prompt.isFeatured ? t("common.removeFromFeatured") : t("common.featureThisPrompt")}
                          >
                            {actionLoading === prompt.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => deletePrompt(prompt)}
                            disabled={actionLoading === prompt.id}
                            className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                            title={t("common.softDelete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
