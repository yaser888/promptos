"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { SOCIAL_ICONS } from "@/engine/socials/socials.types";

interface SocialItem {
  id: string;
  label: string;
  url: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch("/api/admin/system/csrf", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    csrfToken = data.token ?? null;
    return csrfToken;
  } catch {
    return null;
  }
}

interface FormState {
  label: string;
  url: string;
  icon: string;
}

const EMPTY_FORM: FormState = { label: "", url: "", icon: "link" };

export function SocialLinksManager() {
  const t = useTranslations("socialManager");
  const { toast } = useToast();
  const [items, setItems] = useState<SocialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/social-links", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((json) => setItems(json.links ?? []))
      .catch(() => toast({ title: t("loadError") || "Failed to load social links", variant: "error" }))
      .finally(() => setLoading(false));
  }, [t, toast]);

  useEffect(() => load(), [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: SocialItem) => {
    setEditId(item.id);
    setForm({ label: item.label, url: item.url, icon: item.icon });
    setFormError(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.label.trim() || !form.url.trim()) {
      setFormError(t("required") || "Label and URL are required");
      return;
    }
    setBusy("save");
    try {
      const token = await getCsrfToken();
      const method = editId ? "PATCH" : "POST";
      const url = editId ? `/api/admin/social-links/${editId}` : "/api/admin/social-links";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", "x-csrf-token": token ?? "" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      setDialogOpen(false);
      toast({ title: t("saved") || "Saved", variant: "success" });
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      const token = await getCsrfToken();
      const res = await fetch(`/api/admin/social-links/${id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": token ?? "" },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: t("deleted") || "Deleted", variant: "success" });
      load();
    } catch {
      toast({ title: t("deleteError") || "Failed to delete", variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (item: SocialItem) => {
    setBusy(item.id);
    try {
      const token = await getCsrfToken();
      const res = await fetch(`/api/admin/social-links/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": token ?? "" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      load();
    } catch {
      toast({ title: t("saveError") || "Failed to update", variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  const move = async (item: SocialItem, dir: -1 | 1) => {
    const target = items.findIndex((x) => x.id === item.id) + dir;
    if (target < 0 || target >= items.length) return;
    const other = items[target];
    setBusy(item.id);
    try {
      const token = await getCsrfToken();
      const headers = { "content-type": "application/json", "x-csrf-token": token ?? "" };
      await fetch(`/api/admin/social-links/${item.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sortOrder: other.sortOrder }),
      });
      await fetch(`/api/admin/social-links/${other.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      });
      load();
    } catch {
      toast({ title: t("saveError") || "Failed to reorder", variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("title") || "Social Links"}</h1>
          <p className="text-sm text-charcoal-500 mt-1">{t("subtitle") || "Manage the social icons shown in the site footer"}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("add") || "Add link"}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card glass className="p-12 text-center">
          <BrandIcon name="link" className="h-8 w-8 text-charcoal-600 mx-auto mb-3" />
          <p className="text-sm text-charcoal-500">{t("empty") || "No social links yet. Add your first one."}</p>
        </Card>
      ) : (
        <Card glass className="divide-y divide-charcoal-800/50">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charcoal-800 text-charcoal-300">
                <BrandIcon name={item.icon} className="h-5 w-5" />
              </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-charcoal-100">{item.label}</p>
                    {!item.isActive && <Badge variant="outline" size="sm">{t("hidden") || "Hidden"}</Badge>}
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-charcoal-500 hover:text-emerald-400 truncate block">
                    {item.url}
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(item, -1)}
                    disabled={i === 0 || busy !== null}
                    className="rounded-md p-1.5 text-charcoal-500 hover:text-charcoal-200 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(item, 1)}
                    disabled={i === items.length - 1 || busy !== null}
                    className="rounded-md p-1.5 text-charcoal-500 hover:text-charcoal-200 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(item)} disabled={busy !== null}>
                    {item.isActive ? t("hide") || "Hide" : t("show") || "Show"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} disabled={busy !== null}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(item.id)} disabled={busy !== null}>
                    <Trash2 className="h-4 w-4 text-red-400/80" />
                  </Button>
                </div>
              </div>
          ))}
        </Card>
      )}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? t("edit") || "Edit link" : t("add") || "Add link"}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-charcoal-400">{t("label") || "Label"}</span>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="mt-1 w-full rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/40 focus:outline-none"
              placeholder="GitHub"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-charcoal-400">{t("url") || "URL"}</span>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="mt-1 w-full rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/40 focus:outline-none"
              placeholder="https://..."
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-charcoal-400">{t("icon") || "Icon"}</span>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charcoal-800 text-charcoal-200">
                <BrandIcon name={form.icon || "link"} className="h-5 w-5" />
              </div>
              <select
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/40 focus:outline-none"
              >
                {SOCIAL_ICONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </label>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              {t("cancel") || "Cancel"}
            </Button>
            <Button size="sm" onClick={submit} disabled={busy !== null}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("save") || "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
