"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Database, Plus, GitFork, Upload, FileText, Terminal, RefreshCw, Trash2, Loader2, AlertCircle, Inbox, Pencil } from "lucide-react";
import { cn } from "@/utils/cn";

interface Source {
  id: string;
  name: string;
  type: string;
  url: string | null;
  isActive: boolean;
  lastSync: string | null;
  createdAt: string;
  prompts: number;
  importJobs: number;
}

const typeIcons: Record<string, typeof GitFork> = {
  GITHUB: GitFork,
  CSV: Upload,
  MARKDOWN: FileText,
  JSON: Terminal,
  MANUAL: Database,
  API: Terminal,
};

const typeLabels: Record<string, string> = {
  GITHUB: "GitHub",
  CSV: "CSV",
  MARKDOWN: "Markdown",
  JSON: "JSON",
  MANUAL: "Manual",
  API: "API",
};

function relativeTime(dateStr: string | null, t: (key: string, values?: Record<string, string | number>) => string) {
  if (!dateStr) return t("common.never");
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

export default function AdminSourcesPage() {
  const t = useTranslations("adminPages");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({ name: "", type: "MANUAL", url: "" });
  const [editTarget, setEditTarget] = useState<Source | null>(null);
  const [editForm, setEditForm] = useState({ name: "", url: "", isActive: true });
  const [editLoading, setEditLoading] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sources");
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const syncSource = async (s: Source) => {
    setActionLoading(s.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/sources/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      const data = await res.json();
      const imp = data.import;
      if (imp) {
        setNotice(t("sources.syncedResult", { name: s.name, imported: imp.imported, skipped: imp.skipped, failed: imp.failed, total: imp.total }));
      } else {
        setNotice(t("sources.syncStarted", { name: s.name }));
      }
      fetchSources();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSource = async (s: Source) => {
    setActionLoading(s.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/sources/${s.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("sources.deletedSource", { name: s.name }));
      fetchSources();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, type: form.type, url: form.url || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("sources.createdSource", { name: form.name }));
      setCreateOpen(false);
      setForm({ name: "", type: "MANUAL", url: "" });
      fetchSources();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (s: Source) => {
    setEditTarget(s);
    setEditForm({ name: s.name, url: s.url || "", isActive: s.isActive });
  };

  const handleEdit = async () => {
    if (!editTarget || !editForm.name.trim()) return;
    setEditLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/sources/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          url: editForm.url || null,
          isActive: editForm.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("sources.updatedSource", { name: editForm.name }));
      setEditTarget(null);
      fetchSources();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("sources.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("sources.subtitle")}</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("sources.addSource")}
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
        </div>
      )}

      {error && !loading && (
        <Card glass className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-charcoal-300 mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchSources}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.tryAgain")}
          </Button>
        </Card>
      )}

      {!loading && !error && sources.length === 0 && (
        <Card glass className="p-8 text-center">
          <Inbox className="h-10 w-10 text-charcoal-600 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">{t("sources.noSources")}</p>
          <p className="text-charcoal-500 text-sm">{t("sources.noSourcesHint")}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {sources.map((source) => {
          const Icon = typeIcons[source.type] || Database;
          return (
            <Card key={source.id} glass hover className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal-200">{source.name}</h3>
                    <p className="text-xs text-charcoal-600 mt-0.5">{source.url || `type: ${typeLabels[source.type] || source.type}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-end">
                    <p className="text-sm text-charcoal-400">{t("sources.prompts", { count: source.prompts })}</p>
                    <p className="text-xs text-charcoal-600">{t("sources.synced", { time: relativeTime(source.lastSync, t) })}</p>
                  </div>
                  <Badge variant={source.isActive ? "emerald" : "default"} size="sm">
                    {source.isActive ? t("common.active") : t("common.inactive")}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(source)}
                      disabled={actionLoading === source.id}
                      className="p-1.5 rounded-lg text-charcoal-500 hover:text-emerald-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                      title={t("sources.editSource")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => syncSource(source)}
                      disabled={actionLoading === source.id}
                      className="p-1.5 rounded-lg text-charcoal-500 hover:text-emerald-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                      title={t("sources.syncNow")}
                    >
                      {actionLoading === source.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteSource(source)}
                      disabled={actionLoading === source.id}
                      className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                      title={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("sources.addTitle")}
        description={t("sources.addDesc")}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.name")} *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("sources.namePlaceholder")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.type")}</label>
            <div className="flex flex-wrap gap-2">
              {["MANUAL", "GITHUB", "CSV", "MARKDOWN", "JSON", "API"].map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: tp }))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all",
                    form.type === tp
                      ? "border-charcoal-500 bg-charcoal-800 ring-2 ring-emerald-500/30"
                      : "border-charcoal-700 bg-charcoal-900/50 hover:bg-charcoal-800"
                  )}
                >
                  {typeLabels[tp] || tp}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("sources.urlPath")}</label>
            <input
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder={t("sources.urlPlaceholder")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" loading={createLoading} onClick={handleCreate} disabled={!form.name.trim()}>
            {t("common.save")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={t("sources.editSource")}
        description={t("sources.editSourceDesc", { name: editTarget?.name || "" })}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.name")} *</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("sources.sourceName")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("sources.url")}</label>
            <input
              value={editForm.url}
              onChange={(e) => setEditForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder={t("sources.githubUrl")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <label className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
            <span className="text-sm text-charcoal-200">{t("sources.sourceActive")}</span>
            <button
              type="button"
              onClick={() => setEditForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`h-5 w-9 rounded-full transition-colors ${editForm.isActive ? "bg-emerald-500" : "bg-charcoal-700"}`}
            >
              <div className={`h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${editForm.isActive ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
            </button>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setEditTarget(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" loading={editLoading} onClick={handleEdit} disabled={!editForm.name.trim()}>
            {t("common.saveChanges")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
