"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BrandLogo } from "@/components/ui/brand-logo";
import {
  Loader2,
  AlertCircle,
  Upload,
  Trash2,
  Save,
  Check,
  X,
  PanelRightOpen,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface BrandingState {
  siteName: string;
  tagline: string;
  logoUrl: string;
  supportEmail: string;
}

export default function AdminBrandingPage() {
  const t = useTranslations("adminPages");
  const [state, setState] = useState<BrandingState>({ siteName: "", tagline: "", logoUrl: "", supportEmail: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/branding");
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data = await res.json();
      setState({
        siteName: data.siteName || "",
        tagline: data.tagline || "",
        logoUrl: data.logoUrl || "",
        supportEmail: data.supportEmail || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: state.siteName,
          tagline: state.tagline,
          supportEmail: state.supportEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setState({
        siteName: data.siteName || "",
        tagline: data.tagline || "",
        logoUrl: data.logoUrl || "",
        supportEmail: data.supportEmail || "",
      });
      setNotice(t("branding.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/branding/logo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setState((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      setNotice(t("branding.logoUploaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/branding/logo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setState((prev) => ({ ...prev, logoUrl: "" }));
      setNotice(t("branding.logoRemoved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setUploading(false);
      setConfirmReset(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 outline-none focus:border-emerald-500/50";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-100">{t("branding.title")}</h1>
        <p className="text-sm text-charcoal-500 mt-1">
          {t("branding.subtitle")}
        </p>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-400">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-emerald-500/70 hover:text-emerald-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ms-auto text-red-500/70 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-charcoal-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card glass>
                <CardHeader>
                  <CardTitle>{t("branding.logoTitle")}</CardTitle>
                  <CardDescription>{t("branding.logoDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-charcoal-700 bg-charcoal-900/60 overflow-hidden">
                      {state.logoUrl ? (
                        <img src={state.logoUrl} alt={t("branding.siteLogo")} className="h-full w-full object-contain p-2" />
                      ) : (
                        <PanelRightOpen className="h-8 w-8 text-charcoal-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {t("branding.uploadLogo")}
                        </Button>
                        {state.logoUrl && (
                          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)} disabled={uploading}>
                            <Trash2 className="h-4 w-4" /> {t("branding.remove")}
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-charcoal-600">
                        {t("branding.logoFormats")}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f);
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card glass>
                <CardHeader>
                  <CardTitle>{t("branding.identityTitle")}</CardTitle>
                  <CardDescription>{t("branding.identityDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-charcoal-400">{t("branding.siteName")}</label>
                    <input
                      value={state.siteName}
                      onChange={(e) => setState((p) => ({ ...p, siteName: e.target.value }))}
                      placeholder={t("branding.siteNamePlaceholder")}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-charcoal-400">{t("branding.tagline")}</label>
                    <input
                      value={state.tagline}
                      onChange={(e) => setState((p) => ({ ...p, tagline: e.target.value }))}
                      placeholder={t("branding.taglinePlaceholder")}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-charcoal-400">{t("branding.supportEmail")}</label>
                    <input
                      type="email"
                      value={state.supportEmail}
                      onChange={(e) => setState((p) => ({ ...p, supportEmail: e.target.value }))}
                      placeholder={t("branding.supportEmailPlaceholder")}
                      className={inputClass}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card glass>
                <CardHeader>
                  <CardTitle>{t("branding.livePreview")}</CardTitle>
                  <CardDescription>{t("branding.livePreviewDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-charcoal-800/60 bg-charcoal-900/40 p-4">
                    <div className="flex items-center justify-between">
                      <BrandLogo size="md" />
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-14 rounded-md bg-charcoal-800/60" />
                        <span className="h-6 w-14 rounded-md bg-charcoal-800/60" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-charcoal-800/60 bg-charcoal-900/40 p-4">
                    <BrandLogo size="md" sub={t("branding.previewSub")} />
                  </div>
                  <div className="rounded-xl border border-charcoal-800/60 bg-charcoal-900/40 p-4">
                    <BrandLogo size="md" showText={false} />
                    <p className="mt-2 text-xs text-charcoal-600">{t("branding.iconOnly")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card glass>
                <CardHeader>
                  <CardTitle>{t("branding.seoTitle")}</CardTitle>
                  <CardDescription>{t("branding.seoDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-[11px] text-charcoal-600">{t("branding.browserTabTitle")}</p>
                    <p className="text-charcoal-300">{state.siteName || t("branding.siteNamePlaceholder")}{state.tagline ? ` — ${state.tagline}` : ""}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-charcoal-600">{t("branding.footerTagline")}</p>
                    <p className="text-charcoal-300">{state.tagline || t("branding.fallbackTagline")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="primary" onClick={handleSave} disabled={saving || !state.siteName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("branding.saveBranding")}
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t("branding.removeTitle")}
        description={t("branding.removeDesc")}
        size="sm"
      >
        <p className="text-sm text-charcoal-400">
          {t("branding.removeConfirm")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={handleRemoveLogo} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t("branding.removeBtn")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
