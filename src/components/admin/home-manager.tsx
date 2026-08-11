"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  LayoutDashboard,
  Star,
  Layers,
  ListChecks,
  Building2,
  Quote,
  HelpCircle,
  Rocket,
  BadgeDollarSign,
  BarChart3,
} from "lucide-react";
import type { HomeContentData, HomeFeature, HomeStep, HomeTestimonial, HomeFaq, HomeStat } from "@/engine/home/home.types";
import { HOME_DEFAULTS } from "@/engine/home/home.types";

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

type TabKey = "hero" | "sections" | "features" | "steps" | "companies" | "testimonials" | "faqs" | "cta" | "pricing" | "stats";

const TABS: { key: TabKey; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "hero", labelKey: "tabHero", icon: LayoutDashboard },
  { key: "sections", labelKey: "tabSections", icon: ListChecks },
  { key: "features", labelKey: "tabFeatures", icon: Layers },
  { key: "steps", labelKey: "tabSteps", icon: Rocket },
  { key: "stats", labelKey: "tabStats", icon: BarChart3 },
  { key: "companies", labelKey: "tabCompanies", icon: Building2 },
  { key: "testimonials", labelKey: "tabTestimonials", icon: Star },
  { key: "faqs", labelKey: "tabFaqs", icon: HelpCircle },
  { key: "cta", labelKey: "tabCta", icon: Quote },
  { key: "pricing", labelKey: "tabPricing", icon: BadgeDollarSign },
];

const ICON_CHOICES = ["layers", "sparkles", "globe", "share", "zap", "shield", "cloud", "git", "bulb", "wand", "rocket", "chat", "check", "star", "help", "users", "copy", "heart", "grid"];

function Field({
  label,
  value,
  onChange,
  textarea,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-charcoal-400">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/40 focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/40 focus:outline-none"
        />
      )}
      {hint && <span className="mt-1 block text-[11px] text-charcoal-600">{hint}</span>}
    </label>
  );
}

function ItemShell({
  index,
  total,
  onRemove,
  onMove,
  children,
}: {
  index: number;
  total: number;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-charcoal-800/60 bg-charcoal-900/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" size="sm">
          #{index + 1}
        </Badge>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="rounded-md p-1 text-charcoal-500 hover:text-charcoal-200 disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="rounded-md p-1 text-charcoal-500 hover:text-charcoal-200 disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="rounded-md p-1 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function HomeManager() {
  const t = useTranslations("homeManager");
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("hero");
  const [content, setContent] = useState<HomeContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/home-content", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((json) => setContent(json.content ?? HOME_DEFAULTS))
      .catch(() => setError(t("loadError") || "Failed to load home content"))
      .finally(() => setLoading(false));
  }, [t]);

  const setField = useCallback((path: string[], value: unknown) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      let node: Record<string, unknown> = next;
      for (let i = 0; i < path.length - 1; i++) {
        node = node[path[i]] as Record<string, unknown>;
      }
      node[path[path.length - 1]] = value;
      return next as HomeContentData;
    });
  }, []);

  const updateArray = useCallback(
    (key: "stats" | "features" | "steps" | "companies" | "testimonials" | "faqs" | "ctaBullets" | "platforms", index: number, value: unknown) => {
      setContent((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const arr = next[key] as unknown[];
        arr[index] = value;
        return next as HomeContentData;
      });
    },
    []
  );

  const addToArray = useCallback((key: string, empty: unknown) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      (next[key] as unknown[]).push(empty);
      return next as HomeContentData;
    });
  }, []);

  const removeFromArray = useCallback((key: string, index: number) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      (next[key] as unknown[]).splice(index, 1);
      return next as HomeContentData;
    });
  }, []);

  const moveInArray = useCallback((key: string, index: number, dir: -1 | 1) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const arr = next[key] as unknown[];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return prev;
      const [item] = arr.splice(index, 1);
      arr.splice(target, 0, item);
      return next as HomeContentData;
    });
  }, []);

  const save = async () => {
    if (!content) return;
    setSaving(true);
    try {
      const token = await getCsrfToken();
      const res = await fetch("/api/admin/home-content", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": token ?? "" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      const json = await res.json();
      setContent(json.content);
      toast({ title: t("saved") || "Saved", variant: "success" });
    } catch (e) {
      toast({
        title: t("saveError") || "Failed to save",
        description: e instanceof Error ? e.message : undefined,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    setContent(JSON.parse(JSON.stringify(HOME_DEFAULTS)));
    toast({ title: t("defaultsLoaded") || "Defaults loaded — press Save to apply", variant: "warning" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-300">
        {error || "No content"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("title") || "Homepage Content"}</h1>
          <p className="text-sm text-charcoal-500 mt-1">{t("subtitle") || "Edit everything shown on the landing page"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetDefaults} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            {t("reset") || "Reset to defaults"}
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("save") || "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all",
              tab === key
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50 border border-transparent"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      <Card glass className="p-6">
        <div className="space-y-5">
          {tab === "hero" && (
            <>
              <Field label={t("heroBadge") || "Badge"} value={content.hero.badge} onChange={(v) => setField(["hero", "badge"], v)} />
              <Field label={t("heroTitle") || "Title"} value={content.hero.title} onChange={(v) => setField(["hero", "title"], v)} textarea />
              <Field label={t("heroSubtitle") || "Subtitle"} value={content.hero.subtitle} onChange={(v) => setField(["hero", "subtitle"], v)} textarea />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("heroCta") || "Primary button"} value={content.hero.cta} onChange={(v) => setField(["hero", "cta"], v)} />
                <Field label={t("heroSecondary") || "Secondary button"} value={content.hero.secondary} onChange={(v) => setField(["hero", "secondary"], v)} />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-charcoal-400">{t("platforms") || "AI platforms shown"}</span>
                {content.hero.platforms.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={p}
                      onChange={(e) => updateArray("platforms", i, e.target.value)}
                      className="flex-1 rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/40 focus:outline-none"
                    />
                    <button onClick={() => removeFromArray("platforms", i)} className="rounded-md p-1.5 text-red-400/70 hover:text-red-400" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addToArray("platforms", "")}>
                  <Plus className="h-4 w-4" />
                  {t("add") || "Add"}
                </Button>
              </div>
            </>
          )}

          {tab === "sections" && (
            <>
              <Field label={t("featuresTitle") || "Features title"} value={content.featuresTitle} onChange={(v) => setField(["featuresTitle"], v)} />
              <Field label={t("featuresSubtitle") || "Features subtitle"} value={content.featuresSubtitle} onChange={(v) => setField(["featuresSubtitle"], v)} textarea />
              <Field label={t("howTitle") || "How-it-works title"} value={content.howTitle} onChange={(v) => setField(["howTitle"], v)} />
              <Field label={t("howSubtitle") || "How-it-works subtitle"} value={content.howSubtitle} onChange={(v) => setField(["howSubtitle"], v)} textarea />
              <Field label={t("trustedTitle") || "Trusted-by title"} value={content.trustedTitle} onChange={(v) => setField(["trustedTitle"], v)} />
              <Field label={t("testimonialsTitle") || "Testimonials title"} value={content.testimonialsTitle} onChange={(v) => setField(["testimonialsTitle"], v)} />
              <Field label={t("testimonialsSubtitle") || "Testimonials subtitle"} value={content.testimonialsSubtitle} onChange={(v) => setField(["testimonialsSubtitle"], v)} textarea />
              <Field label={t("faqTitle") || "FAQ title"} value={content.faqTitle} onChange={(v) => setField(["faqTitle"], v)} />
              <Field label={t("faqSubtitle") || "FAQ subtitle"} value={content.faqSubtitle} onChange={(v) => setField(["faqSubtitle"], v)} textarea />
            </>
          )}

          {tab === "features" && (
            <div className="space-y-4">
              {content.features.map((f: HomeFeature, i: number) => (
                <ItemShell
                  key={i}
                  index={i}
                  total={content.features.length}
                  onRemove={() => removeFromArray("features", i)}
                  onMove={(dir) => moveInArray("features", i, dir)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("title") || "Title"} value={f.title} onChange={(v) => updateArray("features", i, { ...f, title: v })} />
                    <label className="block">
                      <span className="text-xs font-medium text-charcoal-400">{t("icon") || "Icon"}</span>
                      <select
                        value={f.icon}
                        onChange={(e) => updateArray("features", i, { ...f, icon: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/40 focus:outline-none"
                      >
                        {ICON_CHOICES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Field label={t("description") || "Description"} value={f.description} onChange={(v) => updateArray("features", i, { ...f, description: v })} textarea />
                </ItemShell>
              ))}
              <Button variant="outline" size="sm" onClick={() => addToArray("features", { icon: "sparkles", title: "", description: "" })}>
                <Plus className="h-4 w-4" />
                {t("add") || "Add"}
              </Button>
            </div>
          )}

          {tab === "steps" && (
            <div className="space-y-4">
              {content.steps.map((s: HomeStep, i: number) => (
                <ItemShell
                  key={i}
                  index={i}
                  total={content.steps.length}
                  onRemove={() => removeFromArray("steps", i)}
                  onMove={(dir) => moveInArray("steps", i, dir)}
                >
                  <Field label={t("title") || "Title"} value={s.title} onChange={(v) => updateArray("steps", i, { ...s, title: v })} />
                  <Field label={t("description") || "Description"} value={s.description} onChange={(v) => updateArray("steps", i, { ...s, description: v })} textarea />
                </ItemShell>
              ))}
              <Button variant="outline" size="sm" onClick={() => addToArray("steps", { title: "", description: "" })}>
                <Plus className="h-4 w-4" />
                {t("add") || "Add"}
              </Button>
            </div>
          )}

          {tab === "stats" && (
            <div className="space-y-4">
              <p className="text-xs text-charcoal-500">{t("statsHint") || "Values are counted live from the database. Edit label, live value key, and suffix."}</p>
              {content.stats.map((s: HomeStat, i: number) => (
                <ItemShell
                  key={i}
                  index={i}
                  total={content.stats.length}
                  onRemove={() => removeFromArray("stats", i)}
                  onMove={(dir) => moveInArray("stats", i, dir)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label={t("label") || "Label"} value={s.label} onChange={(v) => updateArray("stats", i, { ...s, label: v })} />
                    <Field label={t("valueKey") || "Value key"} value={s.valueKey} onChange={(v) => updateArray("stats", i, { ...s, valueKey: v })} hint="totalPrompts / totalUsers / totalCopies / totalFavorites" />
                    <Field label={t("suffix") || "Suffix"} value={s.suffix} onChange={(v) => updateArray("stats", i, { ...s, suffix: v })} />
                  </div>
                </ItemShell>
              ))}
              <Button variant="outline" size="sm" onClick={() => addToArray("stats", { label: "", valueKey: "totalPrompts", suffix: "+" })}>
                <Plus className="h-4 w-4" />
                {t("add") || "Add"}
              </Button>
            </div>
          )}

          {tab === "companies" && (
            <div className="space-y-2">
              {content.companies.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={c}
                    onChange={(e) => updateArray("companies", i, e.target.value)}
                    className="flex-1 rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/40 focus:outline-none"
                  />
                  <button onClick={() => removeFromArray("companies", i)} className="rounded-md p-1.5 text-red-400/70 hover:text-red-400" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addToArray("companies", "")}>
                <Plus className="h-4 w-4" />
                {t("add") || "Add"}
              </Button>
            </div>
          )}

          {tab === "testimonials" && (
            <div className="space-y-4">
              {content.testimonials.map((tm: HomeTestimonial, i: number) => (
                <ItemShell
                  key={i}
                  index={i}
                  total={content.testimonials.length}
                  onRemove={() => removeFromArray("testimonials", i)}
                  onMove={(dir) => moveInArray("testimonials", i, dir)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("name") || "Name"} value={tm.name} onChange={(v) => updateArray("testimonials", i, { ...tm, name: v })} />
                    <Field label={t("avatar") || "Avatar initials"} value={tm.avatar} onChange={(v) => updateArray("testimonials", i, { ...tm, avatar: v })} />
                    <Field label={t("role") || "Role"} value={tm.role} onChange={(v) => updateArray("testimonials", i, { ...tm, role: v })} />
                    <Field label={t("company") || "Company"} value={tm.company} onChange={(v) => updateArray("testimonials", i, { ...tm, company: v })} />
                  </div>
                  <Field label={t("content") || "Quote"} value={tm.content} onChange={(v) => updateArray("testimonials", i, { ...tm, content: v })} textarea />
                </ItemShell>
              ))}
              <Button variant="outline" size="sm" onClick={() => addToArray("testimonials", { name: "", role: "", company: "", avatar: "", content: "" })}>
                <Plus className="h-4 w-4" />
                {t("add") || "Add"}
              </Button>
            </div>
          )}

          {tab === "faqs" && (
            <div className="space-y-4">
              {content.faqs.map((f: HomeFaq, i: number) => (
                <ItemShell
                  key={i}
                  index={i}
                  total={content.faqs.length}
                  onRemove={() => removeFromArray("faqs", i)}
                  onMove={(dir) => moveInArray("faqs", i, dir)}
                >
                  <Field label={t("question") || "Question"} value={f.question} onChange={(v) => updateArray("faqs", i, { ...f, question: v })} />
                  <Field label={t("answer") || "Answer"} value={f.answer} onChange={(v) => updateArray("faqs", i, { ...f, answer: v })} textarea />
                </ItemShell>
              ))}
              <Button variant="outline" size="sm" onClick={() => addToArray("faqs", { question: "", answer: "" })}>
                <Plus className="h-4 w-4" />
                {t("add") || "Add"}
              </Button>
            </div>
          )}

          {tab === "cta" && (
            <>
              <Field label={t("ctaTitle") || "Title"} value={content.ctaTitle} onChange={(v) => setField(["ctaTitle"], v)} />
              <Field label={t("ctaSubtitle") || "Subtitle"} value={content.ctaSubtitle} onChange={(v) => setField(["ctaSubtitle"], v)} textarea />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("ctaButton") || "Primary button"} value={content.ctaButton} onChange={(v) => setField(["ctaButton"], v)} />
                <Field label={t("ctaSecondary") || "Secondary button"} value={content.ctaSecondary} onChange={(v) => setField(["ctaSecondary"], v)} />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-charcoal-400">{t("ctaBullets") || "Bullet points"}</span>
                {content.ctaBullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={b}
                      onChange={(e) => updateArray("ctaBullets", i, e.target.value)}
                      className="flex-1 rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/40 focus:outline-none"
                    />
                    <button onClick={() => removeFromArray("ctaBullets", i)} className="rounded-md p-1.5 text-red-400/70 hover:text-red-400" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addToArray("ctaBullets", "")}>
                  <Plus className="h-4 w-4" />
                  {t("add") || "Add"}
                </Button>
              </div>
            </>
          )}

          {tab === "pricing" && (
            <>
              <Field label={t("pricingTitle") || "Title"} value={content.pricingTitle} onChange={(v) => setField(["pricingTitle"], v)} />
              <Field label={t("pricingSubtitle") || "Subtitle"} value={content.pricingSubtitle} onChange={(v) => setField(["pricingSubtitle"], v)} textarea />
              <p className="text-xs text-charcoal-500">
                {t("pricingHint") || "Plans and their features are managed under Admin → Plans. Prices shown here come from the database."}
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
