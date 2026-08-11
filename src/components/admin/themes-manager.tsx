"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";
import { buildThemeCss } from "@/engine/themes/tokens";
import {
  Palette,
  Loader2,
  Check,
  Pencil,
  Copy,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Plus,
} from "lucide-react";

interface ThemeItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: Record<string, string>;
  isPreset: boolean;
  isActive: boolean;
}

const TOKEN_FIELDS = [
  { key: "--color-accent", type: "color", labelKey: "themes.tokAccent" },
  { key: "--color-accent-hover", type: "color", labelKey: "themes.tokAccentHover" },
  { key: "--color-accent-foreground", type: "color", labelKey: "themes.tokAccentForeground" },
  { key: "--color-surface", type: "color", labelKey: "themes.tokSurface" },
  { key: "--color-surface-secondary", type: "color", labelKey: "themes.tokSurfaceSecondary" },
  { key: "--color-surface-tertiary", type: "color", labelKey: "themes.tokSurfaceTertiary" },
  { key: "--color-border", type: "color", labelKey: "themes.tokBorder" },
  { key: "--color-border-light", type: "color", labelKey: "themes.tokBorderLight" },
  { key: "--color-text-primary", type: "color", labelKey: "themes.tokTextPrimary" },
  { key: "--color-text-secondary", type: "color", labelKey: "themes.tokTextSecondary" },
  { key: "--color-text-muted", type: "color", labelKey: "themes.tokTextMuted" },
  { key: "--radius-md", type: "length", labelKey: "themes.tokRadiusMd" },
  { key: "--radius-lg", type: "length", labelKey: "themes.tokRadiusLg" },
  { key: "--radius-xl", type: "length", labelKey: "themes.tokRadiusXl" },
];

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

const PREVIEW_STYLE_ID = "theme-live-preview";

function applyPreview(tokens: Record<string, string>) {
  const existing = document.getElementById(PREVIEW_STYLE_ID);
  if (existing) existing.remove();
  const css = buildThemeCss(tokens);
  if (!css) return;
  const style = document.createElement("style");
  style.id = PREVIEW_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function clearPreview() {
  document.getElementById(PREVIEW_STYLE_ID)?.remove();
}

export function ThemesManager() {
  const t = useTranslations("adminPages");
  const [items, setItems] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editTheme, setEditTheme] = useState<ThemeItem | null>(null);
  const [editTokens, setEditTokens] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchThemes = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/themes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setItems(data.themes);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    mounted.current = true;
    fetchThemes();
    return () => {
      mounted.current = false;
      clearPreview();
    };
  }, [fetchThemes]);

  const mutate = async (url: string, method: "PATCH" | "DELETE", body?: unknown) => {
    const token = await getCsrfToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["x-csrf-token"] = token;
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
    return data;
  };

  const apply = async (theme: ThemeItem) => {
    setBusy(`apply-${theme.id}`);
    setNotice(null);
    try {
      await mutate(`/api/admin/themes/${theme.id}`, "PATCH", { isActive: true });
      setItems((prev) =>
        prev.map((i) => ({ ...i, isActive: i.id === theme.id }))
      );
      setNotice(t("themes.applied"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (theme: ThemeItem) => {
    setEditTheme(theme);
    setEditName(theme.name);
    setEditDesc(theme.description ?? "");
    setEditTokens({ ...theme.tokens });
    applyPreview(theme.tokens);
  };

  const closeEdit = () => {
    clearPreview();
    setEditTheme(null);
  };

  const saveEdit = async () => {
    if (!editTheme) return;
    setBusy("save");
    setNotice(null);
    try {
      await mutate(`/api/admin/themes/${editTheme.id}`, "PATCH", {
        name: editName,
        description: editDesc,
        tokens: editTokens,
      });
      closeEdit();
      await fetchThemes();
      setNotice(t("themes.saved"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async (theme: ThemeItem) => {
    setBusy(`dup-${theme.id}`);
    setNotice(null);
    try {
      const token = await getCsrfToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-csrf-token"] = token;
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `${theme.name} Copy`,
          tokens: theme.tokens,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      await fetchThemes();
      setNotice(t("themes.duplicated"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (theme: ThemeItem) => {
    setBusy(`del-${theme.id}`);
    setNotice(null);
    try {
      await mutate(`/api/admin/themes/${theme.id}`, "DELETE");
      setItems((prev) => prev.filter((i) => i.id !== theme.id));
      setNotice(t("themes.deleted"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const exportTheme = (theme: ThemeItem) => {
    const payload = {
      name: theme.name,
      slug: theme.slug,
      description: theme.description,
      tokens: theme.tokens,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${theme.slug}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = async () => {
    setBusy("import");
    setImportError(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(importText);
      } catch {
        setImportError(t("themes.invalidJson"));
        return;
      }
      const token = await getCsrfToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-csrf-token"] = token;
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers,
        body: JSON.stringify({ import: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setImportOpen(false);
      setImportText("");
      await fetchThemes();
      setNotice(t("themes.imported"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const setToken = (key: string, value: string) => {
    const next = { ...editTokens, [key]: value };
    setEditTokens(next);
    applyPreview(next);
  };

  return (
    <>
      <Card glass>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-emerald-400" />
            <div>
              <CardTitle>{t("themes.title")}</CardTitle>
              <p className="text-sm text-charcoal-500 mt-0.5">{t("themes.hint")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setImportError(null); setImportOpen(true); }}>
              <Upload className="h-4 w-4 me-1.5" />
              {t("themes.import")}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("themes.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notice && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">{notice}</div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-charcoal-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((theme) => (
                <div
                  key={theme.id}
                  className={cn(
                    "rounded-xl border p-4",
                    theme.isActive ? "border-emerald-500/40 bg-emerald-500/5" : "border-charcoal-800/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-charcoal-100">{theme.name}</p>
                        <Badge variant="outline" className="text-charcoal-400">{theme.slug}</Badge>
                        {theme.isPreset && <Badge variant="blue" size="sm">{t("themes.preset")}</Badge>}
                        {theme.isActive && <Badge variant="emerald" size="sm">{t("themes.active")}</Badge>}
                      </div>
                      {theme.description && (
                        <p className="text-sm text-charcoal-500 mt-1">{theme.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(theme.tokens).slice(0, 6).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-charcoal-800/60 text-[11px] text-charcoal-300"
                          >
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-charcoal-700"
                              style={{ background: value }}
                            />
                            {key.replace("--color-", "").replace("--radius-", "")}
                          </span>
                        ))}
                        {Object.keys(theme.tokens).length > 6 && (
                          <span className="text-[11px] text-charcoal-600">+{Object.keys(theme.tokens).length - 6}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant={theme.isActive ? "secondary" : "emerald"}
                        size="sm"
                        onClick={() => apply(theme)}
                        loading={busy === `apply-${theme.id}`}
                        disabled={theme.isActive}
                      >
                        <Check className="h-3.5 w-3.5 me-1.5" />
                        {theme.isActive ? t("themes.active") : t("themes.apply")}
                      </Button>
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(theme)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicate(theme)} loading={busy === `dup-${theme.id}`}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => exportTheme(theme)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {!theme.isPreset && (
                          <Button variant="danger" size="sm" onClick={() => remove(theme)} loading={busy === `del-${theme.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editTheme}
        onClose={closeEdit}
        title={editTheme ? `${t("themes.edit")} — ${editTheme.name}` : ""}
        description={t("themes.editHint")}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-charcoal-500 block mb-1">{t("common.name")}</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg bg-charcoal-900/60 border border-charcoal-800 px-3 py-2 text-sm text-charcoal-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div>
            <label className="text-xs text-charcoal-500 block mb-1">{t("common.description")}</label>
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-lg bg-charcoal-900/60 border border-charcoal-800 px-3 py-2 text-sm text-charcoal-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div className="border-t border-charcoal-800/50 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
            {TOKEN_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-[11px] text-charcoal-500 block mb-1">{t(field.labelKey)}</label>
                <div className="flex items-center gap-2">
                  <input
                    type={field.type === "color" ? "color" : "text"}
                    value={editTokens[field.key] ?? ""}
                    onChange={(e) => setToken(field.key, e.target.value)}
                    className={cn(
                      "rounded-lg bg-charcoal-900/60 border border-charcoal-800 focus:outline-none focus:ring-1 focus:ring-emerald-500/40",
                      field.type === "color" ? "h-9 w-9 p-1 cursor-pointer" : "w-full px-2 py-1.5 text-xs text-charcoal-200"
                    )}
                  />
                  {field.type === "color" && (
                    <input
                      type="text"
                      value={editTokens[field.key] ?? ""}
                      onChange={(e) => setToken(field.key, e.target.value)}
                      className="w-full rounded-lg bg-charcoal-900/60 border border-charcoal-800 px-2 py-1.5 text-xs text-charcoal-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-charcoal-600 flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3" />
            {t("themes.livePreview")}
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={closeEdit}>
            {t("common.cancel")}
          </Button>
          <Button onClick={saveEdit} loading={busy === "save"}>
            {t("common.saveChanges")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("themes.createTitle")}
        description={t("themes.createHint")}
      >
        <p className="text-sm text-charcoal-500">{t("themes.createHintBody")}</p>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={async () => {
              setBusy("create");
              try {
                const token = await getCsrfToken();
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (token) headers["x-csrf-token"] = token;
                const res = await fetch("/api/admin/themes", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ name: t("themes.customTheme") }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
                setCreateOpen(false);
                await fetchThemes();
                openEdit(data.theme);
              } catch (err) {
                setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
              } finally {
                setBusy(null);
              }
            }}
            loading={busy === "create"}
          >
            {t("themes.create")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={t("themes.importTitle")}
        description={t("themes.importHint")}
      >
        <textarea
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            setImportError(null);
          }}
          spellCheck={false}
          placeholder='{"name":"My Theme","slug":"my-theme","tokens":{"--color-accent":"#22c55e",...}}'
          className="w-full h-48 rounded-lg bg-charcoal-900/60 border border-charcoal-800 p-3 font-mono text-xs text-charcoal-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
        />
        {importError && <p className="text-xs text-red-400 mt-2">{importError}</p>}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setImportOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={importTheme} loading={busy === "import"}>
            <Upload className="h-4 w-4 me-1.5" />
            {t("themes.import")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}