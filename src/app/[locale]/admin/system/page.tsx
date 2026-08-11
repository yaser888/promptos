"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/utils/cn";
import { ExtensionsManager } from "@/components/admin/extensions-manager";
import { ThemesManager } from "@/components/admin/themes-manager";
import {
  Activity,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Terminal,
  FileText,
  Loader2,
  Wrench,
  Eraser,
} from "lucide-react";

interface SystemHealth {
  ok: boolean;
  health: { db: boolean; redis: boolean };
  envVars: { name: string; group: string; required: boolean; set: boolean; value: string }[];
  tableCounts: Record<string, number>;
  runtime: {
    node: string;
    platform: string;
    uptimeSeconds: number;
    maintenanceMode: boolean;
    allowRegistration: boolean;
  };
}

interface LogEntry {
  id: string;
  level: string;
  source: string | null;
  message: string;
  metadata: any;
  createdAt: string;
}

interface AutomationSettings {
  marketplaceEnabled: boolean;
  generatorEnabled: boolean;
  blogEnabled: boolean;
  autoBackupEnabled: boolean;
  autoBackupRetention: number;
  autoCleanupEnabled: boolean;
  autoMaintenanceEnabled: boolean;
  autoMaintenanceHour: number;
  lastMaintenanceAt: string | null;
  maintenanceMode: boolean;
  allowRegistration: boolean;
}

interface StoredBackup {
  id: string;
  kind: string;
  label: string;
  rowCount: number;
  sizeKb: number;
  createdAt: string;
}

interface MaintenanceResultSummary {
  ok: boolean;
  health: { db: boolean; redis: boolean };
  backup: { created: boolean } | null;
}

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminSystemPage() {
  const t = useTranslations("adminPages");
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState("health");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreWipe, setRestoreWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [auto, setAuto] = useState<AutomationSettings | null>(null);
  const [autoLoading, setAutoLoading] = useState(true);
  const [backups, setBackups] = useState<StoredBackup[]>([]);
  const [lastResult, setLastResult] = useState<MaintenanceResultSummary | null>(null);
  const autoSaved = useRef(new Date());
  const csrfTokenRef = useRef<string | null>(null);

  const getCsrfToken = useCallback(async (): Promise<string | null> => {
    if (csrfTokenRef.current) return csrfTokenRef.current;
    try {
      const res = await fetch("/api/admin/system/csrf", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      csrfTokenRef.current = data.token ?? null;
      return csrfTokenRef.current;
    } catch {
      return null;
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system", { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setHealth(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system/logs?limit=100", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchAutomation = useCallback(async () => {
    setAutoLoading(true);
    try {
      const res = await fetch("/api/admin/system/automation", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAuto(data.settings ?? null);
        setLastResult((data.lastMaintenanceResult as MaintenanceResultSummary) ?? null);
        setBackups(data.backups ?? []);
      }
    } catch {
      // ignore
    } finally {
      setAutoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchLogs();
    fetchAutomation();
  }, [fetchHealth, fetchLogs, fetchAutomation]);

  const saveAutomation = async (patch: Partial<AutomationSettings>) => {
    setNotice(null);
    try {
      const res = await fetch("/api/admin/system/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      const data = await res.json();
      if (data.settings) setAuto(data.settings);
      autoSaved.current = new Date();
      setNotice(t("system.saved"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    }
  };

  const updateAuto = async (key: keyof AutomationSettings, value: unknown) => {
    const patch = { [key]: value } as Partial<AutomationSettings>;
    const next = { ...auto!, ...patch };
    setAuto(next);
    await saveAutomation(patch);
  };

  const runMaintenanceNow = async () => {
    setBusy("runMaintenance");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/system/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setLastResult(data.result ?? null);
      setNotice(t("system.maintenanceDone"));
      await fetchAutomation();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const saveBackupNow = async () => {
    setBusy("saveBackup");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/system/backups", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setNotice(t("system.backupSaved"));
      await fetchAutomation();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const deleteBackup = async (id: string) => {
    setBusy("deleteBackup");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/system/backups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      setNotice(t("system.backupDeleted"));
      setBackups((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (label: string, url: string, init?: RequestInit) => {
    setBusy(label);
    setNotice(null);
    try {
      const token = await getCsrfToken();
      const headers = new Headers(init?.headers);
      headers.set("Content-Type", "application/json");
      if (token) headers.set("x-csrf-token", token);
      const res = await fetch(url, {
        ...init,
        method: init?.method ?? "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setNotice(data.message || label + " ✓");
      return data;
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const clearCache = (scope: "redis" | "next" | "all") =>
    runAction(scope, "/api/admin/system/cache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: scope }),
    }).then(() => fetchHealth());

  const runTool = (action: string) =>
    runAction(action, "/api/admin/system/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).then((data) => {
      if (data?.updated !== undefined) setNotice(`${action}: ${data.updated}`);
    });

  const downloadBackup = async () => {
    setBusy("backup");
    try {
      const res = await fetch("/api/admin/system/backup", { cache: "no-store" });
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const header = res.headers.get("Content-Disposition") || "";
      a.download = header.includes("filename=")
        ? header.split('filename="')[1].split('"')[0]
        : `promptos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(t("system.backupCreated"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const restoreBackup = async (file: File) => {
    setRestoreOpen(false);
    setBusy("restore");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await runAction("restore", "/api/admin/system/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, wipe: restoreWipe }),
      });
      if (result?.restored !== undefined) {
        setNotice(`${t("system.restoreDone")} ${result.restored} / ${result.skipped}`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clearLogs = async () => {
    setBusy("clearLogs");
    try {
      const res = await fetch("/api/admin/system/logs", { method: "DELETE" });
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      setLogs([]);
      setNotice(t("system.logsCleared"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card glass className="p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-charcoal-300 mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchHealth}>{t("common.tryAgain")}</Button>
      </Card>
    );
  }

  const missingRequired = health?.envVars.filter((v) => v.required && !v.set) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("system.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("system.subtitle")}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchHealth} loading={busy === "refresh"}>
          <RefreshCw className="h-4 w-4" />
          {t("system.refresh")}
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg", health?.health.db ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-500">{t("system.dbStatus")}</p>
              <p className="text-sm font-semibold text-charcoal-100">
                {health?.health.db ? t("system.connected") : t("system.disconnected")}
              </p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg", health?.health.redis ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
              <Server className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-500">{t("system.redisStatus")}</p>
              <p className="text-sm font-semibold text-charcoal-100">
                {health?.health.redis ? t("system.connected") : t("system.notConfigured")}
              </p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg", missingRequired.length === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-500">{t("system.envStatus")}</p>
              <p className="text-sm font-semibold text-charcoal-100">
                {missingRequired.length === 0 ? t("system.allConfigured") : `${missingRequired.length} ${t("system.missing")}`}
              </p>
            </div>
          </div>
        </Card>
        <Card glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-500">{t("system.uptime")}</p>
              <p className="text-sm font-semibold text-charcoal-100">{fmtUptime(health?.runtime.uptimeSeconds ?? 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full max-w-3xl flex-wrap">
          <TabsTrigger value="health">{t("system.tabHealth")}</TabsTrigger>
          <TabsTrigger value="cache">{t("system.tabCache")}</TabsTrigger>
          <TabsTrigger value="backup">{t("system.tabBackup")}</TabsTrigger>
          <TabsTrigger value="logs">{t("system.tabLogs")}</TabsTrigger>
          <TabsTrigger value="tools">{t("system.tabTools")}</TabsTrigger>
          <TabsTrigger value="themes">{t("system.tabThemes")}</TabsTrigger>
          <TabsTrigger value="extensions">{t("system.tabExtensions")}</TabsTrigger>
          <TabsTrigger value="automation">{t("system.tabAutomation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card glass>
              <CardHeader>
                <CardTitle>{t("system.envVars")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {health?.envVars.map((v) => (
                    <div key={v.name} className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal-800/30">
                      <div>
                        <p className="text-sm font-mono text-charcoal-200">{v.name}</p>
                        <p className="text-xs text-charcoal-600">{v.group}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-charcoal-500">{v.value}</span>
                        <Badge variant={v.set ? "emerald" : v.required ? "red" : "default"} size="sm">
                          {v.set ? t("system.set") : v.required ? t("system.missing") : t("system.optional")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card glass>
              <CardHeader>
                <CardTitle>{t("system.tableCounts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(health?.tableCounts ?? {})
                    .filter(([, n]) => n >= 0)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([name, count]) => (
                      <div key={name} className="p-3 rounded-lg bg-charcoal-800/30">
                        <p className="text-lg font-bold text-charcoal-100">{count.toLocaleString()}</p>
                        <p className="text-xs text-charcoal-500 capitalize">{name}</p>
                      </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-charcoal-800/50 text-xs text-charcoal-500">
                  Node {health?.runtime.node} &middot; {health?.runtime.platform}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache">
          <Card glass>
            <CardHeader>
              <CardTitle>{t("system.cacheTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-charcoal-500">{t("system.cacheHint")}</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => clearCache("redis")} loading={busy === "redis"}>
                  <Trash2 className="h-4 w-4" />
                  {t("system.clearRedis")}
                </Button>
                <Button variant="secondary" onClick={() => clearCache("next")} loading={busy === "next"}>
                  <RefreshCw className="h-4 w-4" />
                  {t("system.revalidateAll")}
                </Button>
                <Button variant="primary" onClick={() => clearCache("all")} loading={busy === "all"}>
                  <Eraser className="h-4 w-4" />
                  {t("system.clearAll")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card glass>
              <CardHeader>
                <CardTitle>
                  <Download className="h-4 w-4 inline mr-2 text-emerald-400" />
                  {t("system.backupTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-charcoal-500">{t("system.backupHint")}</p>
                <Button variant="primary" onClick={downloadBackup} loading={busy === "backup"}>
                  <Download className="h-4 w-4" />
                  {t("system.downloadBackup")}
                </Button>
              </CardContent>
            </Card>

            <Card glass>
              <CardHeader>
                <CardTitle>
                  <Upload className="h-4 w-4 inline mr-2 text-amber-400" />
                  {t("system.restoreTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-charcoal-500">{t("system.restoreHint")}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) restoreBackup(f);
                  }}
                />
                <Button variant="outline" onClick={() => setRestoreOpen(true)} loading={busy === "restore"}>
                  <Upload className="h-4 w-4" />
                  {t("system.uploadBackup")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card glass>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>
                  <Terminal className="h-4 w-4 inline mr-2 text-emerald-400" />
                  {t("system.logsTitle")}
                </CardTitle>
                <Button variant="danger" size="sm" onClick={clearLogs} loading={busy === "clearLogs"}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("system.clearLogs")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="h-8 w-8 text-charcoal-600 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-500">{t("system.noLogs")}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-charcoal-800/30">
                      {log.level === "error" ? (
                        <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      ) : log.level === "warn" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-charcoal-600">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                          {log.source && (
                            <Badge variant="default" size="sm">{log.source}</Badge>
                          )}
                          <Badge
                            size="sm"
                            variant={log.level === "error" ? "red" : log.level === "warn" ? "default" : "emerald"}
                          >
                            {log.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-charcoal-200 mt-1 break-words">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card glass>
              <CardHeader>
                <CardTitle>
                  <Wrench className="h-4 w-4 inline mr-2 text-emerald-400" />
                  {t("system.toolsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-charcoal-500">{t("system.toolsHint")}</p>
                <Button variant="secondary" className="w-full justify-start" onClick={() => runTool("resetDailyCounters")} loading={busy === "resetDailyCounters"}>
                  <RefreshCw className="h-4 w-4" />
                  {t("system.resetCounters")}
                </Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => runTool("purgeDeleted")} loading={busy === "purgeDeleted"}>
                  <Trash2 className="h-4 w-4" />
                  {t("system.purgeDeleted")}
                </Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => runTool("fixOrphanCategories")} loading={busy === "fixOrphanCategories"}>
                  <Wrench className="h-4 w-4" />
                  {t("system.fixOrphans")}
                </Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => runTool("purgeDuplicatePrompts")} loading={busy === "purgeDuplicatePrompts"}>
                  <Eraser className="h-4 w-4" />
                  {t("system.purgeDuplicates")}
                </Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => runTool("resetAllViews")} loading={busy === "resetAllViews"}>
                  <RefreshCw className="h-4 w-4" />
                  {t("system.resetViews")}
                </Button>
              </CardContent>
            </Card>

            <Card glass>
              <CardHeader>
                <CardTitle>
                  <Database className="h-4 w-4 inline mr-2 text-amber-400" />
                  {t("system.databaseTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-charcoal-500">{t("system.databaseHint")}</p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
                  <div>
                    <p className="text-sm text-charcoal-200">{t("system.maintenanceMode")}</p>
                    <p className="text-xs text-charcoal-600">{t("system.maintenanceModeHint")}</p>
                  </div>
                  <Badge variant={health?.runtime.maintenanceMode ? "red" : "emerald"} size="sm">
                    {health?.runtime.maintenanceMode ? t("system.on") : t("system.off")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
                  <div>
                    <p className="text-sm text-charcoal-200">{t("system.registration")}</p>
                    <p className="text-xs text-charcoal-600">{t("system.registrationHint")}</p>
                  </div>
                  <Badge variant={health?.runtime.allowRegistration ? "emerald" : "default"} size="sm">
                    {health?.runtime.allowRegistration ? t("system.on") : t("system.off")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      <TabsContent value="automation">
          {autoLoading || !auto ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card glass>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    {t("system.automationTitle")}
                  </CardTitle>
                  <p className="text-sm text-charcoal-500">{t("system.automationHint")}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-charcoal-200">{t("system.marketplaceEnabled")}</p>
                        <p className="text-xs text-charcoal-600">{t("system.marketplaceHint")}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={auto.marketplaceEnabled}
                        onChange={(e) => updateAuto("marketplaceEnabled", e.target.checked)}
                        className="h-4 w-4 accent-emerald-500 shrink-0"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-charcoal-200">{t("system.generatorEnabled")}</p>
                        <p className="text-xs text-charcoal-600">{t("system.generatorHint")}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={auto.generatorEnabled}
                        onChange={(e) => updateAuto("generatorEnabled", e.target.checked)}
                        className="h-4 w-4 accent-emerald-500 shrink-0"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-charcoal-200">{t("system.blogEnabled")}</p>
                        <p className="text-xs text-charcoal-600">{t("system.blogHint")}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={auto.blogEnabled}
                        onChange={(e) => updateAuto("blogEnabled", e.target.checked)}
                        className="h-4 w-4 accent-emerald-500 shrink-0"
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card glass>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                    {t("system.scheduledMaintenance")}
                  </CardTitle>
                  <p className="text-sm text-charcoal-500">{t("system.scheduledHint")}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-charcoal-200">{t("system.autoMaintenanceEnabled")}</p>
                      <p className="text-xs text-charcoal-600">{t("system.autoMaintenanceHint")}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={auto.autoMaintenanceEnabled}
                      onChange={(e) => updateAuto("autoMaintenanceEnabled", e.target.checked)}
                      className="h-4 w-4 accent-emerald-500 shrink-0"
                    />
                  </label>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-charcoal-800/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-charcoal-200">{t("system.autoMaintenanceHour")}</p>
                      <p className="text-xs text-charcoal-600">{t("system.autoMaintenanceHourHint")}</p>
                    </div>
                    <select
                      value={auto.autoMaintenanceHour}
                      onChange={(e) => updateAuto("autoMaintenanceHour", Number(e.target.value))}
                      className="rounded-lg border border-charcoal-700 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-100"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}:00 UTC</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-charcoal-200">{t("system.autoCleanupEnabled")}</p>
                      <p className="text-xs text-charcoal-600">{t("system.autoCleanupHint")}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={auto.autoCleanupEnabled}
                      onChange={(e) => updateAuto("autoCleanupEnabled", e.target.checked)}
                      className="h-4 w-4 accent-emerald-500 shrink-0"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-charcoal-200">{t("system.autoBackupEnabled")}</p>
                      <p className="text-xs text-charcoal-600">{t("system.autoBackupHint")}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={auto.autoBackupEnabled}
                      onChange={(e) => updateAuto("autoBackupEnabled", e.target.checked)}
                      className="h-4 w-4 accent-emerald-500 shrink-0"
                    />
                  </label>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-charcoal-800/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-charcoal-200">{t("system.autoBackupRetention")}</p>
                      <p className="text-xs text-charcoal-600">{t("system.autoBackupRetentionHint")}</p>
                    </div>
                    <select
                      value={auto.autoBackupRetention}
                      onChange={(e) => updateAuto("autoBackupRetention", Number(e.target.value))}
                      className="rounded-lg border border-charcoal-700 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-100"
                    >
                      {[3, 7, 14, 30, 60, 90].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card glass>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-emerald-400" />
                      {t("system.runNow")}
                    </CardTitle>
                    <p className="text-sm text-charcoal-500">{t("system.runNowHint")}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button variant="primary" onClick={runMaintenanceNow} loading={busy === "runMaintenance"}>
                        <RefreshCw className="h-4 w-4" />
                        {busy === "runMaintenance" ? t("system.running") : t("system.runNow")}
                      </Button>
                      <div className="text-xs text-charcoal-500">
                        {t("system.lastRun")}: {auto.lastMaintenanceAt ? new Date(auto.lastMaintenanceAt).toLocaleString() : t("system.never")}
                      </div>
                    </div>
                    {lastResult && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-charcoal-800/30">
                        {lastResult.ok && lastResult.health?.db ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        )}
                        <span className="text-sm text-charcoal-200">
                          {lastResult.ok && lastResult.health?.db ? t("system.healthy") : t("system.unhealthy")}
                        </span>
                        <span className="text-xs text-charcoal-600">
                          DB {lastResult.health?.db ? "OK" : "FAIL"} · Redis {lastResult.health?.redis ? "OK" : "n/a"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card glass>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-emerald-400" />
                      {t("system.storedBackups")}
                    </CardTitle>
                    <p className="text-sm text-charcoal-500">{t("system.storedBackupsHint")}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="secondary" size="sm" onClick={saveBackupNow} loading={busy === "saveBackup"}>
                      <Database className="h-4 w-4" />
                      {t("system.doBackupNow")}
                    </Button>
                    {backups.length === 0 ? (
                      <p className="text-sm text-charcoal-500 text-center py-6">{t("system.noBackups")}</p>
                    ) : (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {backups.map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-charcoal-800/30">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-charcoal-200 truncate">{b.label}</p>
                              <p className="text-xs text-charcoal-600">
                                {t(`system.${b.kind === "manual" ? "manual" : "auto"}`)} · {t("system.rows", { count: b.rowCount })} · {t("system.sizeKb", { count: b.sizeKb })}
                              </p>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteBackup(b.id)}
                              loading={busy === "deleteBackup"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="extensions">
          <ExtensionsManager />
        </TabsContent>

        <TabsContent value="themes">
          <ThemesManager />
        </TabsContent>
      </Tabs>

      <Dialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        title={t("system.restoreTitle")}
        description={t("system.restoreConfirm")}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
            <input
              type="checkbox"
              checked={restoreWipe}
              onChange={(e) => setRestoreWipe(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            <span className="text-sm text-charcoal-200">{t("system.restoreWipe")}</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setRestoreOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {t("system.chooseFile")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
