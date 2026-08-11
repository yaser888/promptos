"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Settings,
  Globe,
  Mail,
  Shield,
  CreditCard,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Languages,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface PlatformSettings {
  id: string;
  siteName: string;
  siteDescription: string | null;
  supportEmail: string | null;
  maintenanceMode: boolean;
  defaultPlan: string;
  trialDays: number;
  allowRegistration: boolean;
  seoTitleTemplate: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  metadata: Record<string, any>;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  validUntil: string | null;
  isActive: boolean;
}

interface SiteLanguage {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  flag: string;
  enabled: boolean;
  isDefault: boolean;
  isCustom: boolean;
}

const gateways = ["Stripe", "PayPal", "Paddle", "Lemon Squeezy", "Wise"];

function formatUses(dc: DiscountCode) {
  return dc.maxUses ? `${dc.usedCount}/${dc.maxUses}` : `${dc.usedCount}/∞`;
}

function formatExpiry(dc: DiscountCode, t: (key: string, values?: Record<string, string | number>) => string) {
  if (!dc.validUntil) return t("common.never");
  return new Date(dc.validUntil).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSettingsPage() {
  const t = useTranslations("adminPages");
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    siteName: "",
    siteDescription: "",
    supportEmail: "",
    trialDays: 7,
    maintenanceMode: false,
    allowRegistration: true,
  });

  const [seoForm, setSeoForm] = useState({
    seoTitleTemplate: "",
    seoKeywords: "",
    ogImageUrl: "",
    robotsIndex: true,
    robotsFollow: true,
  });

  const [gatewayState, setGatewayState] = useState<Record<string, boolean>>({});
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeForm, setCodeForm] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "10",
    maxUses: "",
  });

  const [languages, setLanguages] = useState<SiteLanguage[]>([]);
  const [langSaving, setLangSaving] = useState(false);
  const [langDialogOpen, setLangDialogOpen] = useState(false);
  const [langForm, setLangForm] = useState({
    code: "",
    name: "",
    nativeName: "",
    dir: "ltr" as "ltr" | "rtl",
    flag: "",
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data = await res.json();
      const s: PlatformSettings = data.settings;
      setSettings(s);
      setForm({
        siteName: s.siteName || "PromptOS",
        siteDescription: s.siteDescription || "",
        supportEmail: s.supportEmail || "",
        trialDays: s.trialDays,
        maintenanceMode: s.maintenanceMode,
        allowRegistration: s.allowRegistration,
      });
      const meta = s.metadata || {};
      const gw: Record<string, boolean> = {};
      for (const g of gateways) gw[g] = (meta.paymentGateways || {})[g] ?? g === "Stripe";
      setGatewayState(gw);
      setSeoForm({
        seoTitleTemplate: s.seoTitleTemplate || "",
        seoKeywords: s.seoKeywords || "",
        ogImageUrl: s.ogImageUrl || "",
        robotsIndex: s.robotsIndex,
        robotsFollow: s.robotsFollow,
      });

      const codesRes = await fetch("/api/admin/discount-codes");
      if (codesRes.ok) {
        const codesData = await codesRes.json();
        setDiscountCodes(codesData.codes ?? []);
      }

      const langsRes = await fetch("/api/admin/site-languages");
      if (langsRes.ok) {
        const langsData = await langsRes.json();
        setLanguages(langsData.languages ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveChanges = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: form.siteName,
          siteDescription: form.siteDescription || null,
          supportEmail: form.supportEmail || null,
          trialDays: Number(form.trialDays) || 7,
          maintenanceMode: form.maintenanceMode,
          allowRegistration: form.allowRegistration,
          paymentGateways: gatewayState,
          seoTitleTemplate: seoForm.seoTitleTemplate || null,
          seoKeywords: seoForm.seoKeywords || null,
          ogImageUrl: seoForm.ogImageUrl || null,
          robotsIndex: seoForm.robotsIndex,
          robotsFollow: seoForm.robotsFollow,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("settings.savedSuccess"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const toggleCode = async (dc: DiscountCode) => {
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/discount-codes/${dc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !dc.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      fetchSettings();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    }
  };

  const deleteCode = async (dc: DiscountCode) => {
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/discount-codes/${dc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      fetchSettings();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    }
  };

  const createCode = async () => {
    setNotice(null);
    try {
      const res = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeForm.code.toUpperCase(),
          description: codeForm.description || null,
          discountType: codeForm.discountType,
          discountValue: parseFloat(codeForm.discountValue),
          maxUses: codeForm.maxUses ? parseInt(codeForm.maxUses) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setCodeDialogOpen(false);
      setCodeForm({ code: "", description: "", discountType: "PERCENTAGE", discountValue: "10", maxUses: "" });
      fetchSettings();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    }
  };

  const saveLanguages = async (next: SiteLanguage[]) => {
    setLangSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/site-languages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languages: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      const data = await res.json();
      setLanguages(data.languages ?? []);
      setNotice(t("languages.saved"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLangSaving(false);
    }
  };

  const toggleLanguage = async (lang: SiteLanguage) => {
    if (lang.isDefault) {
      setNotice(t("languages.cannotDisableDefault"));
      return;
    }
    const next = languages.map((l) =>
      l.code === lang.code ? { ...l, enabled: !l.enabled } : l
    );
    if (!next.some((l) => l.enabled)) {
      setNotice(t("languages.needOneEnabled"));
      return;
    }
    await saveLanguages(next);
  };

  const deleteLanguage = async (lang: SiteLanguage) => {
    if (!lang.isCustom) return;
    if (!window.confirm(t("languages.deleteConfirm"))) return;
    const next = languages.filter((l) => l.code !== lang.code);
    if (!next.some((l) => l.enabled)) {
      setNotice(t("languages.needOneEnabled"));
      return;
    }
    await saveLanguages(next);
  };

  const addLanguage = async () => {
    const code = langForm.code.trim().toLowerCase();
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(code)) {
      setNotice(t("languages.codeInvalid"));
      return;
    }
    if (languages.some((l) => l.code === code)) {
      setNotice(t("languages.codeExists"));
      return;
    }
    if (languages.length >= 16) {
      setNotice(t("languages.maxReached"));
      return;
    }
    const next: SiteLanguage[] = [
      ...languages,
      {
        code,
        name: langForm.name.trim() || code,
        nativeName: langForm.nativeName.trim() || langForm.name.trim() || code,
        dir: langForm.dir,
        flag: langForm.flag.trim(),
        enabled: true,
        isDefault: false,
        isCustom: true,
      },
    ];
    await saveLanguages(next);
    setLangDialogOpen(false);
    setLangForm({ code: "", name: "", nativeName: "", dir: "ltr", flag: "" });
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
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-charcoal-300 mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchSettings}>{t("common.tryAgain")}</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-100">{t("settings.title")}</h1>
        <p className="text-charcoal-500 mt-1">{t("settings.subtitle")}</p>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card glass>
          <CardHeader>
            <CardTitle>
              <Globe className="h-4 w-4 inline mr-2 text-emerald-400" />
              {t("settings.general")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label={t("settings.platformName")}
              value={form.siteName}
              onChange={(e) => setForm((prev) => ({ ...prev, siteName: e.target.value }))}
            />
            <Input
              label={t("settings.supportEmail")}
              type="email"
              value={form.supportEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
            />
            <Input
              label={t("settings.trialDays")}
              type="number"
              value={String(form.trialDays)}
              onChange={(e) => setForm((prev) => ({ ...prev, trialDays: parseInt(e.target.value) || 0 }))}
            />
            <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
              <div>
                <p className="text-sm text-charcoal-200">{t("settings.allowRegistration")}</p>
                <p className="text-xs text-charcoal-600">{t("settings.allowRegistrationHint")}</p>
              </div>
              <button
                onClick={() => setForm((prev) => ({ ...prev, allowRegistration: !prev.allowRegistration }))}
                className={cn("h-5 w-9 rounded-full transition-colors", form.allowRegistration ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", form.allowRegistration ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
              <div>
                <p className="text-sm text-charcoal-200">{t("settings.maintenanceMode")}</p>
                <p className="text-xs text-charcoal-600">{t("settings.maintenanceModeHint")}</p>
              </div>
              <button
                onClick={() => setForm((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                className={cn("h-5 w-9 rounded-full transition-colors", form.maintenanceMode ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", form.maintenanceMode ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </div>
            <Button variant="primary" loading={saving} onClick={saveChanges}>
              {t("settings.saveChanges")}
            </Button>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle>
              <CreditCard className="h-4 w-4 inline mr-2 text-emerald-400" />
              {t("settings.paymentGateways")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gateways.map((gw) => (
                <div key={gw} className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-charcoal-400" />
                    <span className="text-sm text-charcoal-200">{gw}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={gatewayState[gw] ? "emerald" : "default"} size="sm">
                      {gatewayState[gw] ? t("common.active") : t("common.inactive")}
                    </Badge>
                    <button
                      onClick={() => setGatewayState((prev) => ({ ...prev, [gw]: !prev[gw] }))}
                      className={cn("h-5 w-9 rounded-full transition-colors", gatewayState[gw] ? "bg-emerald-500" : "bg-charcoal-700")}
                    >
                      <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", gatewayState[gw] ? "translate-x-[18px]" : "translate-x-[2px]")} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={saveChanges} loading={saving}>
                {t("settings.saveGateways")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle>
              <Mail className="h-4 w-4 inline mr-2 text-emerald-400" />
              {t("settings.email")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-charcoal-500">
              {t("settings.emailHint", { email: settings?.supportEmail || t("settings.notSet") })}{" "}
              {t("settings.smtpHint")}
            </p>
            <Button variant="secondary" onClick={() => setNotice(t("settings.smtpNotice"))}>
              {t("settings.testConnection")}
            </Button>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle>
              <Shield className="h-4 w-4 inline mr-2 text-emerald-400" />
              {t("settings.discountCodes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {discountCodes.length === 0 && (
                <p className="text-sm text-charcoal-500 text-center py-6">{t("settings.noCodes")}</p>
              )}
              {discountCodes.map((dc) => (
                <div key={dc.id} className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-charcoal-200">{dc.code}</span>
                      <Badge variant="emerald" size="sm">
                        {dc.discountType === "PERCENTAGE" ? `${dc.discountValue}%` : `$${dc.discountValue}`}
                      </Badge>
                    </div>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      {t("settings.uses", { uses: formatUses(dc) })} &middot; {t("settings.expires", { date: formatExpiry(dc, t) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCode(dc)}
                      className={cn("h-5 w-9 rounded-full transition-colors", dc.isActive ? "bg-emerald-500" : "bg-charcoal-700")}
                      title={dc.isActive ? t("settings.deactivate") : t("settings.activate")}
                    >
                      <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", dc.isActive ? "translate-x-[18px]" : "translate-x-[2px]")} />
                    </button>
                    <button
                      onClick={() => deleteCode(dc)}
                      className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setCodeDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("settings.addCode")}
            </Button>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle>
              <Search className="h-4 w-4 inline mr-2 text-emerald-400" />
              {t("settings.seoCardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label={t("settings.titleTemplate")}
              value={seoForm.seoTitleTemplate}
              onChange={(e) => setSeoForm((prev) => ({ ...prev, seoTitleTemplate: e.target.value }))}
              placeholder={t("settings.titleTemplatePlaceholder")}
            />
            <Input
              label={t("settings.defaultKeywords")}
              value={seoForm.seoKeywords}
              onChange={(e) => setSeoForm((prev) => ({ ...prev, seoKeywords: e.target.value }))}
              placeholder={t("settings.keywordsPlaceholder")}
            />
            <Input
              label={t("settings.ogImageUrl")}
              value={seoForm.ogImageUrl}
              onChange={(e) => setSeoForm((prev) => ({ ...prev, ogImageUrl: e.target.value }))}
              placeholder={t("settings.ogPlaceholder")}
            />
            <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
              <div>
                <p className="text-sm text-charcoal-200">{t("settings.allowIndexing")}</p>
                <p className="text-xs text-charcoal-600">{t("settings.allowIndexingHint")}</p>
              </div>
              <button
                onClick={() => setSeoForm((prev) => ({ ...prev, robotsIndex: !prev.robotsIndex }))}
                className={cn("h-5 w-9 rounded-full transition-colors", seoForm.robotsIndex ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", seoForm.robotsIndex ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
              <div>
                <p className="text-sm text-charcoal-200">{t("settings.allowFollow")}</p>
                <p className="text-xs text-charcoal-600">{t("settings.allowFollowHint")}</p>
              </div>
              <button
                onClick={() => setSeoForm((prev) => ({ ...prev, robotsFollow: !prev.robotsFollow }))}
                className={cn("h-5 w-9 rounded-full transition-colors", seoForm.robotsFollow ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", seoForm.robotsFollow ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </div>
            <Button variant="primary" loading={saving} onClick={saveChanges}>
              {t("settings.saveSeo")}
            </Button>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle>
              <Languages className="h-4 w-4 inline mr-2 text-emerald-400" />
              {t("languages.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-charcoal-500 mb-4">{t("languages.translationNote")}</p>
            <div className="space-y-3 mb-4">
              {languages.map((lang) => (
                <div key={lang.code} className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg leading-none">{lang.flag || "🌐"}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-charcoal-200 truncate">
                          {lang.nativeName}
                        </span>
                        <span className="text-xs text-charcoal-500 font-mono">{lang.code}</span>
                        {lang.isDefault && (
                          <Badge variant="emerald" size="sm">
                            {t("languages.defaultBadge")}
                          </Badge>
                        )}
                        {lang.isCustom && (
                          <Badge size="sm">
                            {t("languages.customBadge")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-600 mt-0.5">{lang.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lang.enabled ? "emerald" : "default"} size="sm">
                      {lang.enabled ? t("common.active") : t("common.inactive")}
                    </Badge>
                    <button
                      onClick={() => toggleLanguage(lang)}
                      disabled={lang.isDefault || langSaving}
                      title={lang.isDefault ? t("languages.cannotDisableDefault") : ""}
                      className={cn(
                        "h-5 w-9 rounded-full transition-colors disabled:opacity-40",
                        lang.enabled ? "bg-emerald-500" : "bg-charcoal-700"
                      )}
                    >
                      <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", lang.enabled ? "translate-x-[18px]" : "translate-x-[2px]")} />
                    </button>
                    {lang.isCustom && (
                      <button
                        onClick={() => deleteLanguage(lang)}
                        disabled={langSaving}
                        className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setLangDialogOpen(true)} disabled={langSaving || languages.length >= 16}>
              <Plus className="h-4 w-4" />
              {t("languages.addLanguage")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={codeDialogOpen}
        onClose={() => setCodeDialogOpen(false)}
        title={t("settings.addCode")}
        description={t("settings.codeDesc")}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("settings.code")}</label>
            <input
              value={codeForm.code}
              onChange={(e) => setCodeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder={t("settings.codePlaceholder")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("settings.type")}</label>
              <select
                value={codeForm.discountType}
                onChange={(e) => setCodeForm((prev) => ({ ...prev, discountType: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="PERCENTAGE">{t("settings.percentage")}</option>
                <option value="FIXED">{t("settings.fixed")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("settings.value")}</label>
              <input
                type="number"
                value={codeForm.discountValue}
                onChange={(e) => setCodeForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("settings.maxUses")}</label>
            <input
              type="number"
              value={codeForm.maxUses}
              onChange={(e) => setCodeForm((prev) => ({ ...prev, maxUses: e.target.value }))}
              placeholder={t("settings.unlimited")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("settings.description")}</label>
            <input
              value={codeForm.description}
              onChange={(e) => setCodeForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t("settings.optional")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setCodeDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={createCode} disabled={!codeForm.code.trim() || !codeForm.discountValue}>
            {t("settings.create")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={langDialogOpen}
        onClose={() => setLangDialogOpen(false)}
        title={t("languages.addLanguage")}
        description={t("languages.addDesc")}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("languages.code")}</label>
              <input
                value={langForm.code}
                onChange={(e) => setLangForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder={t("languages.codePlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("languages.flag")}</label>
              <input
                value={langForm.flag}
                onChange={(e) => setLangForm((prev) => ({ ...prev, flag: e.target.value }))}
                placeholder={t("languages.flagPlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("languages.name")}</label>
              <input
                value={langForm.name}
                onChange={(e) => setLangForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Indonesian"
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("languages.nativeName")}</label>
              <input
                value={langForm.nativeName}
                onChange={(e) => setLangForm((prev) => ({ ...prev, nativeName: e.target.value }))}
                placeholder="Bahasa Indonesia"
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("languages.dir")}</label>
            <select
              value={langForm.dir}
              onChange={(e) => setLangForm((prev) => ({ ...prev, dir: e.target.value as "ltr" | "rtl" }))}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="ltr">{t("languages.ltr")}</option>
              <option value="rtl">{t("languages.rtl")}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setLangDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={addLanguage} disabled={!langForm.code.trim() || langSaving}>
            {t("languages.create")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
