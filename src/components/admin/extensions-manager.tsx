"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  Puzzle,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  FileJson,
  ScrollText,
  ShieldCheck,
  Link2,
  Store,
  Settings2,
  Play,
  GitBranch,
  ChartColumn,
  Send,
  Webhook,
  Search,
  Star,
  Mail,
  Code,
} from "lucide-react";

interface ExtensionItem {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string | null;
  author: string | null;
  license: string | null;
  state: string;
  namespace: string;
  permissions: string[];
  dependencies: string[];
  installedAt: string;
  latestLog: { level: string; message: string; createdAt: string } | null;
  logCount: number;
}

interface CatalogEntry {
  manifest: {
    name: string;
    slug: string;
    version: string;
    description?: string;
    author?: string;
    license?: string;
    namespace: string;
    permissions: string[];
    dependencies: string[];
  };
  category: string;
  icon: string;
  configFields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "number";
    placeholder?: string;
    required?: boolean;
    secret?: boolean;
    help?: string;
  }[];
  installed: string | null;
  installedVersion: string | null;
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

const ICONS: Record<string, any> = {
  GitBranch,
  ChartColumn,
  Send,
  Webhook,
  Search,
  Star,
  Mail,
  Code,
};

const SAMPLE_MANIFEST = `{
  "name": "Prompt of the Day Widget",
  "slug": "prompt-of-day-widget",
  "version": "1.0.0",
  "description": "Shows a daily featured prompt on your homepage",
  "author": "PromptOS",
  "license": "MIT",
  "namespace": "prompts",
  "permissions": ["prompts.read"],
  "dependencies": []
}`;

export function ExtensionsManager() {
  const t = useTranslations("adminPages");
  const [tab, setTab] = useState<"installed" | "store">("installed");
  const [items, setItems] = useState<ExtensionItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [manifest, setManifest] = useState(SAMPLE_MANIFEST);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [logsFor, setLogsFor] = useState<ExtensionItem | null>(null);
  const [logs, setLogs] = useState<{ level: string; message: string; createdAt: string }[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [configFor, setConfigFor] = useState<ExtensionItem | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [configError, setConfigError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchExtensions = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system/extensions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setItems(data.extensions);
      const catRes = await fetch("/api/admin/system/extensions/catalog", { cache: "no-store" });
      if (catRes.ok) {
        const cat = await catRes.json();
        setCatalog(cat.catalog ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    mounted.current = true;
    fetchExtensions();
    return () => {
      mounted.current = false;
    };
  }, [fetchExtensions]);

  const mutate = async (url: string, body?: unknown) => {
    const token = await getCsrfToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["x-csrf-token"] = token;
    const res = await fetch(url, {
      method: body === undefined ? "DELETE" : "PATCH",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
    return data;
  };

  const install = async (manifestOverride?: string) => {
    setBusy("install");
    setManifestError(null);
    setNotice(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(manifestOverride ?? manifest);
      } catch {
        setManifestError(t("extensions.invalidJson"));
        return;
      }
      const token = await getCsrfToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-csrf-token"] = token;
      const res = await fetch("/api/admin/system/extensions", {
        method: "POST",
        headers,
        body: JSON.stringify({ manifest: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setInstallOpen(false);
      setTab("installed");
      setNotice(t("extensions.installDone"));
      await fetchExtensions();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (item: ExtensionItem) => {
    const target = item.state === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setBusy(`toggle-${item.id}`);
    setNotice(null);
    try {
      await mutate(`/api/admin/system/extensions/${item.id}`, { state: target });
      await fetchExtensions();
      setNotice(t("extensions.saved"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: ExtensionItem) => {
    setBusy(`remove-${item.id}`);
    setNotice(null);
    try {
      await mutate(`/api/admin/system/extensions/${item.id}`);
      setItems((prev) => prev.filter((e) => e.id !== item.id));
      setNotice(t("extensions.removed"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const openLogs = async (item: ExtensionItem) => {
    setLogsFor(item);
    setLogsLoading(true);
    setLogs([]);
    try {
      const res = await fetch(`/api/admin/system/extensions/${item.id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setLogs(data.logs);
    } catch {
      // ignore — empty log state is fine
    } finally {
      setLogsLoading(false);
    }
  };

  const openConfig = (item: ExtensionItem) => {
    const entry = catalog.find((c) => c.manifest.slug === item.slug);
    const values: Record<string, string> = {};
    entry?.configFields.forEach((f) => {
      values[f.key] = "";
    });
    setConfigValues(values);
    setConfigError(null);
    setConfigFor({ ...item, _entry: entry } as any);
  };

  const saveConfig = async () => {
    if (!configFor) return;
    setBusy(`config-${configFor.id}`);
    setConfigError(null);
    const entry = (configFor as any)._entry as CatalogEntry | undefined;
    for (const field of entry?.configFields ?? []) {
      if (field.required && !configValues[field.key]?.trim()) {
        setConfigError(`${field.label} is required`);
        setBusy(null);
        return;
      }
    }
    try {
      const config: Record<string, unknown> = {};
      for (const field of entry?.configFields ?? []) {
        const raw = configValues[field.key] ?? "";
        if (field.type === "number") {
          config[field.key] = raw ? Number(raw) : null;
        } else if (raw.trim()) {
          config[field.key] = raw;
        }
      }
      await mutate(`/api/admin/system/extensions/${configFor.id}`, { config });
      setConfigFor(null);
      setNotice(t("extensions.saved"));
      await fetchExtensions();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const runNow = async (slug: string) => {
    setBusy(`run-${slug}`);
    setNotice(null);
    try {
      const token = await getCsrfToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-csrf-token"] = token;
      const res = await fetch("/api/admin/system/extensions/run", {
        method: "POST",
        headers,
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setNotice(data.result?.ok ? t("extensions.runDone") : `${t("extensions.runFailed")}: ${data.result?.error ?? ""}`);
      await fetchExtensions();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const renderFields = (fields: CatalogEntry["configFields"]) => (
    <div className="space-y-4">
      {fields.map((field) => (
        <Input
          key={field.key}
          label={field.label}
          type={field.type === "number" ? "number" : field.secret ? "password" : "text"}
          placeholder={field.placeholder}
          value={configValues[field.key] ?? ""}
          onChange={(e) =>
            setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))
          }
        />
      ))}
    </div>
  );

  return (
    <>
      <Card glass>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-emerald-400" />
            <div>
              <CardTitle>{t("extensions.title")}</CardTitle>
              <p className="text-sm text-charcoal-500 mt-0.5">{t("extensions.hint")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-charcoal-800 p-0.5">
              <button
                onClick={() => setTab("installed")}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md transition-colors",
                  tab === "installed" ? "bg-emerald-500/15 text-emerald-400" : "text-charcoal-500 hover:text-charcoal-300"
                )}
              >
                {t("extensions.tabInstalled")}
              </button>
              <button
                onClick={() => setTab("store")}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md transition-colors",
                  tab === "store" ? "bg-emerald-500/15 text-emerald-400" : "text-charcoal-500 hover:text-charcoal-300"
                )}
              >
                <Store className="h-3.5 w-3.5 inline me-1 -mt-0.5" />
                {t("extensions.tabStore")}
              </button>
            </div>
            <Button size="sm" onClick={() => { setManifestError(null); setInstallOpen(true); }}>
              <FileJson className="h-4 w-4 me-1.5" />
              {t("extensions.install")}
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

          {tab === "store" ? (
            loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-charcoal-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.loading")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catalog.map((entry) => {
                  const Icon = ICONS[entry.icon] ?? Puzzle;
                  const installed = entry.installed;
                  return (
                    <div
                      key={entry.manifest.slug}
                      className="rounded-xl border border-charcoal-800/50 p-5 flex flex-col"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-charcoal-100">{entry.manifest.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-charcoal-400 text-[10px]">{entry.category}</Badge>
                              <Badge variant="emerald" size="sm">v{entry.manifest.version}</Badge>
                            </div>
                          </div>
                        </div>
                        {installed === "ACTIVE" && (
                          <Badge variant="emerald" size="sm">{t("extensions.state_active")}</Badge>
                        )}
                        {installed === "DISABLED" && (
                          <Badge variant="default" size="sm">{t("extensions.state_disabled")}</Badge>
                        )}
                      </div>
                      {entry.manifest.description && (
                        <p className="text-sm text-charcoal-500 mt-3 flex-1">{entry.manifest.description}</p>
                      )}
                      {entry.configFields.length > 0 && (
                        <p className="text-xs text-charcoal-600 mt-2">
                          {t("extensions.storeConfigNote")}:{" "}
                          {entry.configFields.map((f) => f.label).join(", ")}
                        </p>
                      )}
                      <div className="flex justify-end mt-4">
                        {installed ? (
                          <Button variant="secondary" size="sm" disabled>
                            {t("extensions.installedLabel")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => install(JSON.stringify(entry.manifest, null, 2))}
                            loading={busy === "install"}
                          >
                            <Store className="h-3.5 w-3.5 me-1.5" />
                            {t("extensions.installFromStore")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-charcoal-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-charcoal-500">
              <Puzzle className="h-8 w-8 mb-2 text-charcoal-700" />
              <p className="text-sm">{t("extensions.noExtensions")}</p>
              <Button size="sm" variant="secondary" className="mt-4" onClick={() => setTab("store")}>
                <Store className="h-3.5 w-3.5 me-1.5" />
                {t("extensions.browseStore")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4",
                    item.state === "ACTIVE" ? "border-charcoal-800/50" : "border-charcoal-800/30 opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-charcoal-100">{item.name}</p>
                        <Badge variant="outline" className="text-charcoal-400">{item.slug}</Badge>
                        <Badge variant="emerald" size="sm">v{item.version}</Badge>
                        <Badge variant={item.state === "ACTIVE" ? "emerald" : "default"} size="sm">
                          {t(`extensions.state_${item.state?.toLowerCase?.() ?? item.state}`)}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-charcoal-500 mt-1">{item.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-charcoal-600">
                        <span>{t("extensions.namespace")}: <span className="text-charcoal-400 font-mono">{item.namespace}</span></span>
                        {item.author && <span>{t("extensions.author")}: {item.author}</span>}
                        {item.license && <span>{item.license}</span>}
                        <span>{t("extensions.installedAt")}: {new Date(item.installedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.permissions.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-charcoal-800/60 text-[11px] text-charcoal-300">
                            <ShieldCheck className="h-3 w-3" />
                            {p}
                          </span>
                        ))}
                        {item.dependencies.map((d) => (
                          <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-[11px] text-blue-400">
                            <Link2 className="h-3 w-3" />
                            {d}
                          </span>
                        ))}
                      </div>
                      {item.latestLog && (
                        <p className="flex items-center gap-1.5 text-xs text-charcoal-600 mt-2">
                          <ScrollText className="h-3 w-3" />
                          <span className="truncate">{item.latestLog.message}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant={item.state === "ACTIVE" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggle(item)}
                        loading={busy === `toggle-${item.id}`}
                      >
                        {item.state === "ACTIVE" ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        {item.state === "ACTIVE" ? t("extensions.disable") : t("extensions.enable")}
                      </Button>
                      <div className="flex justify-end gap-2">
                        {catalog.some((c) => c.manifest.slug === item.slug && c.configFields.length > 0) && (
                          <Button variant="ghost" size="sm" onClick={() => openConfig(item)}>
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {catalog.some((c) => c.manifest.slug === item.slug) && (
                          <Button variant="ghost" size="sm" onClick={() => runNow(item.slug)} loading={busy === `run-${item.slug}`} title={t("extensions.runNow")}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openLogs(item)}>
                          <ScrollText className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => remove(item)} loading={busy === `remove-${item.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title={t("extensions.installTitle")}
        description={t("extensions.installHint")}
      >
        <textarea
          value={manifest}
          onChange={(e) => {
            setManifest(e.target.value);
            setManifestError(null);
          }}
          spellCheck={false}
          className="w-full h-64 rounded-lg bg-charcoal-900/60 border border-charcoal-800 p-3 font-mono text-xs text-charcoal-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
        />
        {manifestError && <p className="text-xs text-red-400 mt-2">{manifestError}</p>}
        <p className="text-xs text-charcoal-600 mt-2">{t("extensions.manifestFields")}</p>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setInstallOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => install()} loading={busy === "install"}>
            {t("extensions.install")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!configFor}
        onClose={() => setConfigFor(null)}
        title={configFor ? `${configFor.name} — ${t("extensions.configTitle")}` : ""}
        description={t("extensions.configHint")}
      >
        {configFor && renderFields(((configFor as any)._entry as CatalogEntry | undefined)?.configFields ?? [])}
        {configError && <p className="text-xs text-red-400 mt-3">{configError}</p>}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setConfigFor(null)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={saveConfig} loading={busy === `config-${configFor?.id}`}>
            {t("extensions.saveConfig")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!logsFor}
        onClose={() => setLogsFor(null)}
        title={logsFor ? `${logsFor.name} — ${t("extensions.logs")}` : ""}
        description={t("extensions.logsHint")}
      >
        {logsLoading ? (
          <div className="flex items-center justify-center py-8 text-charcoal-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-charcoal-500 text-center py-8">{t("extensions.noLogs")}</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0",
                    log.level === "error"
                      ? "bg-red-500/10 text-red-400"
                      : log.level === "warn"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                  )}
                >
                  {log.level}
                </span>
                <span className="text-charcoal-300 break-words">{log.message}</span>
                <span className="text-charcoal-600 ms-auto shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}
