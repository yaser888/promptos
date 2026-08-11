"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  HardDrive,
  ShieldCheck,
  Wrench,
  UserPlus,
  Users,
  FileText,
  CreditCard,
  LayoutTemplate,
  Puzzle,
  Palette,
  DatabaseBackup,
  Activity,
  ScrollText,
  History,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Boxes,
  ServerCog,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface CenterData {
  ok: boolean;
  version: {
    app: string;
    core: string;
    engine: string;
    next: string;
    react: string;
    node: string;
    platform: string;
    environment: "development" | "test" | "production";
    uptimeSeconds: number;
  };
  health: { db: boolean; redis: boolean };
  runtime: {
    maintenanceMode: boolean;
    allowRegistration: boolean;
    marketplaceEnabled: boolean;
    generatorEnabled: boolean;
    blogEnabled: boolean;
  };
  counts: {
    users: number;
    prompts: number;
    activeSubscriptions: number;
    pages: number;
    extensions: number;
    themes: number;
    backups: number;
  };
  security: {
    rateLimiting: boolean;
    csrfProtection: boolean;
    auditEnabled: boolean;
    auditLast24h: number;
  };
  recents: {
    logs: { id: string; level: string; source: string; message: string; createdAt: string }[];
    backups: { id: string; kind: string; label: string | null; sizeKb: number; createdAt: string }[];
    audit: { id: string; actorName: string | null; action: string; resource: string; createdAt: string }[];
  };
  lastAppliedUpdate: { version: string; title: string; appliedAt: string } | null;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string, t: (key: string, values?: Record<string, string | number>) => string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return t("center.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("center.minAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(hours > 1 ? "center.hoursAgo" : "center.hourAgo", { n: hours });
  const days = Math.floor(hours / 24);
  return t(days > 1 ? "center.daysAgo" : "center.dayAgo", { n: days });
}

const logLevelClass: Record<string, string> = {
  info: "bg-emerald-500/10 text-emerald-400",
  warn: "bg-amber-500/10 text-amber-400",
  error: "bg-red-500/10 text-red-400",
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  const t = useTranslations("adminPages");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
      <span className="opacity-70">{ok ? t("center.on") : t("center.off")}</span>
    </span>
  );
}

export function SystemCenter() {
  const t = useTranslations("adminPages");
  const [data, setData] = useState<CenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchCenter = useCallback(() => {
    let attempts = 0;
    const run = () => {
      if (!mountedRef.current) return;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      setLoading(true);
      setError(null);
      fetch("/api/admin/system/center", { signal: controller.signal, cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error(t("center.failedToLoad"));
          return res.json();
        })
        .then((json) => {
          clearTimeout(timer);
          if (!mountedRef.current) return;
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          clearTimeout(timer);
          if (!mountedRef.current) return;
          attempts++;
          if (attempts < 3) {
            setTimeout(run, 700 * attempts);
          } else {
            setError(err.message || t("center.failedToLoad"));
            setLoading(false);
          }
        });
    };
    run();
  }, [t]);

  useEffect(() => {
    mountedRef.current = true;
    fetchCenter();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCenter]);

  if (loading) {
    return (
      <Card glass className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full mt-4" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card glass className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ServerCog className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-charcoal-200">{t("center.title")}</h2>
          </div>
          <Button variant="outline" size="xs" onClick={fetchCenter}>
            {t("system.refresh")}
          </Button>
        </div>
        <p className="text-sm text-charcoal-500 mt-3">{error || t("center.failedToLoad")}</p>
      </Card>
    );
  }

  const { version, health, runtime, counts, security, recents, lastAppliedUpdate } = data;

  const healthCards = [
    {
      icon: Database,
      label: t("system.dbStatus"),
      ok: health.db,
      detail: health.db ? t("system.connected") : t("system.disconnected"),
    },
    {
      icon: HardDrive,
      label: t("system.redisStatus"),
      ok: health.redis,
      detail: health.redis ? t("system.connected") : t("system.disconnected"),
    },
    {
      icon: Wrench,
      label: t("system.maintenanceMode"),
      ok: !runtime.maintenanceMode,
      detail: runtime.maintenanceMode ? t("center.modeOn") : t("center.modeOff"),
    },
    {
      icon: UserPlus,
      label: t("center.registration"),
      ok: runtime.allowRegistration,
      detail: runtime.allowRegistration ? t("center.open") : t("center.closed"),
    },
  ];

  const countItems = [
    { icon: Users, label: t("overview.totalUsers"), value: counts.users },
    { icon: FileText, label: t("overview.totalPrompts"), value: counts.prompts },
    { icon: CreditCard, label: t("overview.activeSubscriptions"), value: counts.activeSubscriptions },
    { icon: LayoutTemplate, label: t("center.pages"), value: counts.pages },
    { icon: Puzzle, label: t("center.extensions"), value: counts.extensions },
    { icon: Palette, label: t("center.themes"), value: counts.themes },
    { icon: DatabaseBackup, label: t("system.storedBackups"), value: counts.backups },
  ];

  const quickLinks = [
    { href: "/admin/system?tab=health", label: t("system.tabHealth"), icon: Activity },
    { href: "/admin/system?tab=backup", label: t("system.tabBackup"), icon: DatabaseBackup },
    { href: "/admin/system?tab=logs", label: t("system.tabLogs"), icon: ScrollText },
    { href: "/admin/system?tab=tools", label: t("system.tabTools"), icon: Wrench },
    { href: "/admin/system?tab=automation", label: t("system.tabAutomation"), icon: Boxes },
  ];

  return (
    <Card glass className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ServerCog className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-charcoal-200">{t("center.title")}</h2>
          <Badge variant="outline" className="text-charcoal-400">
            v{version.app}
          </Badge>
          <Badge variant="outline" className="text-charcoal-400 hidden sm:inline-flex">
            {t("center.core")} v{version.core}
          </Badge>
          <Badge variant="outline" className="text-charcoal-400 hidden sm:inline-flex">
            {t("center.engine")} v{version.engine}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-charcoal-500">
          <Clock className="h-3.5 w-3.5" />
          {t("system.uptime")}: {formatUptime(version.uptimeSeconds)}
          <span className="hidden md:inline text-charcoal-600">
            · {version.node} · {version.platform} · {version.environment}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {healthCards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 transition-colors",
              card.ok ? "border-charcoal-800/50" : "border-red-500/30 bg-red-500/5"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                card.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}
            >
              <card.icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-charcoal-500 truncate">{card.label}</p>
              <p className="text-sm font-semibold text-charcoal-200">{card.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <StatusPill ok={security.rateLimiting} label={t("center.rateLimiting")} />
        <StatusPill ok={security.csrfProtection} label={t("center.csrf")} />
        <StatusPill ok={security.auditEnabled} label={t("center.audit")} />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-charcoal-800 text-charcoal-300">
          <History className="h-3 w-3" />
          {t("center.auditLast24h", { n: security.auditLast24h })}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-charcoal-800 text-charcoal-300">
          <ShieldCheck className="h-3 w-3" />
          {t("center.coreProtected")}
        </span>
        {lastAppliedUpdate && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            {t("center.lastUpdate", { version: lastAppliedUpdate.version })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
        {countItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-charcoal-800/50 p-3 text-center">
            <item.icon className="h-4 w-4 mx-auto mb-1.5 text-charcoal-500" />
            <p className="text-lg font-bold text-charcoal-100 leading-none">{item.value.toLocaleString()}</p>
            <p className="text-[11px] text-charcoal-500 mt-1 truncate">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-charcoal-400 flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              {t("system.logsTitle")}
            </span>
            <Button variant="ghost" size="xs" asChild>
              <Link href="/admin/system?tab=logs">{t("overview.viewAll")}</Link>
            </Button>
          </div>
          <div className="space-y-1.5">
            {recents.logs.length === 0 ? (
              <p className="text-xs text-charcoal-600 text-center py-4">{t("system.noLogs")}</p>
            ) : (
              recents.logs.map((log) => (
                <div key={log.id} className="flex items-center gap-2 text-xs">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium uppercase", logLevelClass[log.level] ?? "bg-charcoal-800 text-charcoal-400")}>
                    {log.level}
                  </span>
                  <span className="text-charcoal-400 truncate">{log.message}</span>
                  <span className="text-charcoal-600 ms-auto shrink-0">{formatDate(log.createdAt, t)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-charcoal-400 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              {t("center.auditTrail")}
            </span>
          </div>
          <div className="space-y-1.5">
            {recents.audit.length === 0 ? (
              <p className="text-xs text-charcoal-600 text-center py-4">{t("center.noAudit")}</p>
            ) : (
              recents.audit.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-charcoal-800 text-charcoal-300 font-medium">
                    {entry.action}
                  </span>
                  <span className="text-charcoal-400 truncate">
                    {entry.actorName ?? t("overview.unknown")} → {entry.resource}
                  </span>
                  <span className="text-charcoal-600 ms-auto shrink-0">{formatDate(entry.createdAt, t)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-charcoal-400 flex items-center gap-1.5">
              <DatabaseBackup className="h-3.5 w-3.5" />
              {t("system.backupTitle")}
            </span>
            <Button variant="ghost" size="xs" asChild>
              <Link href="/admin/system?tab=backup">{t("overview.viewAll")}</Link>
            </Button>
          </div>
          <div className="space-y-1.5">
            {recents.backups.length === 0 ? (
              <p className="text-xs text-charcoal-600 text-center py-4">{t("system.noBackups")}</p>
            ) : (
              recents.backups.map((backup) => (
                <div key={backup.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                      backup.kind === "auto" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                    )}
                  >
                    {t(`system.${backup.kind}`)}
                  </span>
                  <span className="text-charcoal-400 truncate">{backup.label || t("center.manualBackup")}</span>
                  <span className="text-charcoal-600 ms-auto shrink-0">{formatDate(backup.createdAt, t)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-charcoal-800/50">
        {quickLinks.map((link) => (
          <Button key={link.href} variant="outline" size="xs" asChild>
            <Link href={link.href}>
              <link.icon className="h-3.5 w-3.5 me-1.5" />
              {link.label}
            </Link>
          </Button>
        ))}
      </div>
    </Card>
  );
}