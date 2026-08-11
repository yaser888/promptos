"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  Stethoscope,
  Search,
  Loader2,
  Check,
  Copy,
  Save,
  Replace,
  GitBranch,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  ThumbsUp,
  BookOpen,
  Trash2,
  Layers,
  Wand2,
  History,
  X,
  Lock,
} from "lucide-react";
import { useAuthUser } from "@/components/providers/auth-provider";
import Link from "next/link";

type Severity = "critical" | "warning" | "info";

interface CategoryScore {
  code: string;
  score: number;
  summary: string;
}

interface Issue {
  severity: Severity;
  category: string;
  code: string;
  message: string;
}

interface AnalysisStats {
  words: number;
  sentences: number;
  avgSentenceLength: number;
  sections: string[];
  placeholders: string[];
}

interface Analysis {
  overall: number;
  scores: CategoryScore[];
  issues: Issue[];
  strengths: string[];
  improvements: string[];
  stats: AnalysisStats;
}

interface FixChange {
  type: "added" | "removed" | "reworded" | "defined";
  label: string;
}

interface LibraryPrompt {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
}

const severityMeta: Record<Severity, { icon: typeof Info; cls: string; label: string }> = {
  critical: { icon: AlertCircle, cls: "text-red-400 border-red-500/30 bg-red-500/10", label: "critical" },
  warning: { icon: AlertTriangle, cls: "text-amber-400 border-amber-500/30 bg-amber-500/10", label: "warning" },
  info: { icon: Info, cls: "text-sky-400 border-sky-500/30 bg-sky-500/10", label: "info" },
};

function scoreColor(score: number) {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  if (score >= 40) return "#fb923c";
  return "#f87171";
}

export default function PromptDoctorPage() {
  const t = useTranslations("promptDoctor");
  const { isSignedIn } = useAuthUser();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);

  const [fixing, setFixing] = useState(false);
  const [fix, setFix] = useState<{ improved: string; changes: FixChange[] } | null>(null);

  const [sourcePromptId, setSourcePromptId] = useState<string | null>(null);
  const [canEditSource, setCanEditSource] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryPrompt[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const [history, setHistory] = useState<Array<{ id: string; title: string; overall: number; createdAt: string; content: string }>>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedId, setCopiedId] = useState<"original" | "improved" | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/prompt-doctor/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setHistoryEnabled(Boolean(d.enabled));
          if (d.enabled && Array.isArray(d.items)) setHistory(d.items);
        }
      })
      .catch(() => {});
  }, [isSignedIn]);

  const runAnalyze = useCallback(
    async (text: string, label?: string) => {
      setAnalyzing(true);
      setError(null);
      try {
        const res = await fetch("/api/prompt-doctor/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, title: label || undefined }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Analysis failed");
        }
        const data = await res.json();
        setAnalysis(data.analysis);
        setHistoryEnabled(Boolean(data.history?.enabled));
        setHistorySaved(Boolean(data.history?.saved));
        if (data.history?.saved) {
          fetch("/api/prompt-doctor/history")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.enabled && Array.isArray(d.items)) setHistory(d.items);
            })
            .catch(() => {});
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  const handleAnalyze = () => {
    if (!content.trim()) {
      setError(t("emptyInput"));
      return;
    }
    setFix(null);
    setSourcePromptId(null);
    setCanEditSource(false);
    runAnalyze(content, title || undefined);
  };

  const openLibrary = async () => {
    setLibraryOpen(true);
    if (libraryItems.length > 0) return;
    setLoadingLibrary(true);
    try {
      const res = await fetch("/api/prompts?pageSize=60&sortBy=createdAt");
      const data = await res.json();
      setLibraryItems(
        (data.data || []).map((p: { id: string; title: string; description: string | null; tags: string[] }) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          tags: p.tags || [],
        }))
      );
    } catch {
      showToast(t("loadFailed"));
    } finally {
      setLoadingLibrary(false);
    }
  };

  const pickFromLibrary = async (prompt: LibraryPrompt) => {
    setLibraryOpen(false);
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setContent(data.content || "");
      setTitle(data.title || "");
      setSourcePromptId(data.id);
      setCanEditSource(Boolean(data.canEdit));
      setFix(null);
      runAnalyze(data.content || "", data.title || undefined);
    } catch {}
  };

  const handleFix = async () => {
    if (!analysis || !content.trim()) return;
    setFixing(true);
    setError(null);
    try {
      const res = await fetch("/api/prompt-doctor/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Fix failed");
      const data = await res.json();
      setFix(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fix failed");
    } finally {
      setFixing(false);
    }
  };

  const copyText = async (key: "original" | "improved", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
      showToast(t("copied"));
    } catch {}
  };

  const handleSave = async () => {
    if (!fix || !isSignedIn) {
      if (!isSignedIn) showToast(t("requiresLogin"));
      return;
    }
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Improved prompt",
          content: fix.improved,
          description: "Improved with Prompt Doctor",
          isPublic: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionMsg(`${t("savedToLibrary")} ${data.id}`);
        showToast(t("saved"));
      } else {
        showToast(t("saveFailed"));
      }
    } catch {
      showToast(t("saveFailed"));
    }
  };

  const handleReplace = async () => {
    if (!fix || !sourcePromptId || !canEditSource) {
      if (!isSignedIn) showToast(t("requiresLogin"));
      else if (sourcePromptId && !canEditSource) showToast(t("notOwner"));
      return;
    }
    try {
      const res = await fetch(`/api/prompts/${sourcePromptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fix.improved, changelog: "Replaced with Prompt Doctor improved version" }),
      });
      if (res.ok) {
        showToast(t("replaced"));
        setActionMsg(t("replaced"));
      } else {
        showToast(t("replaceFailed"));
      }
    } catch {
      showToast(t("replaceFailed"));
    }
  };

  const handleCreateVersion = async () => {
    if (!fix || !sourcePromptId || !canEditSource) {
      if (!isSignedIn) showToast(t("requiresLogin"));
      else if (sourcePromptId && !canEditSource) showToast(t("notOwner"));
      return;
    }
    try {
      await fetch(`/api/prompts/${sourcePromptId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-version",
          changelog: "Snapshot before Prompt Doctor improvements",
        }),
      });
      const res = await fetch(`/api/prompts/${sourcePromptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fix.improved, changelog: "Applied Prompt Doctor improved version" }),
      });
      if (res.ok) {
        showToast(t("versionCreated"));
        setActionMsg(t("versionCreated"));
      } else {
        showToast(t("replaceFailed"));
      }
    } catch {
      showToast(t("replaceFailed"));
    }
  };

  const loadHistoryItem = async (item: { id: string; title: string; content: string }) => {
    setContent(item.content);
    setTitle(item.title);
    setSourcePromptId(null);
    setCanEditSource(false);
    setFix(null);
    runAnalyze(item.content, item.title);
  };

  const clearHistory = async () => {
    try {
      const res = await fetch("/api/prompt-doctor/history", { method: "DELETE" });
      if (res.ok) {
        setHistory([]);
        showToast(t("historyCleared"));
      }
    } catch {}
  };

  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return libraryItems;
    return libraryItems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  }, [libraryItems, librarySearch]);

  const overall = analysis?.overall ?? 0;
  const overallColor = scoreColor(overall);

  return (
    <>
      <Header />
      <main className="pt-24 pb-16">
        <Container>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                <Stethoscope className="h-6 w-6 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-charcoal-100">{t("title")}</h1>
            </div>
            <p className="text-charcoal-400 mt-2">{t("subtitle")}</p>
          </div>

          {/* Input */}
          <Card glass className="p-5 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-300 mb-1.5">
                  {t("inputLabel")}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("inputPlaceholder")}
                  rows={8}
                  className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-y font-mono leading-relaxed"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className="flex h-10 flex-1 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={openLibrary}>
                    <Layers className="h-4 w-4" />
                    {t("fromLibrary")}
                  </Button>
                  <Button variant="primary" onClick={handleAnalyze} loading={analyzing}>
                    {!analyzing && <Stethoscope className="h-4 w-4" />}
                    {t("analyze")}
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {historySaved && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  {t("historySavedNote")}
                </p>
              )}
            </div>
          </Card>

          {/* Report */}
          {analysis && (
            <div className="space-y-6 mb-6">
              <Card glass className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Overall ring */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="relative h-36 w-36">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          fill="none"
                          stroke={overallColor}
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${(overall / 100) * 326.7} 326.7`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold" style={{ color: overallColor }}>
                          {overall}
                        </span>
                        <span className="text-xs text-charcoal-500">/100</span>
                      </div>
                    </div>
                    <Badge variant="default" size="sm" className="mt-3">
                      {t(`grade.${overall >= 80 ? "excellent" : overall >= 60 ? "good" : overall >= 40 ? "fair" : "poor"}`)}
                    </Badge>
                  </div>

                  {/* Category scores */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {analysis.scores.map((s) => {
                      const color = scoreColor(s.score);
                      return (
                        <div key={s.code} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-charcoal-300">{t(`scores.${s.code}`)}</span>
                            <span className="text-xs font-semibold" style={{ color }}>
                              {s.score}/100
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-charcoal-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${s.score}%`, backgroundColor: color }}
                            />
                          </div>
                          <p className="text-[11px] text-charcoal-500 leading-snug">{s.summary}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-charcoal-800/50 text-xs text-charcoal-500">
                  <span>
                    <strong className="text-charcoal-300">{analysis.stats.words}</strong> {t("stats.words")}
                  </span>
                  <span>
                    <strong className="text-charcoal-300">{analysis.stats.sentences}</strong> {t("stats.sentences")}
                  </span>
                  <span>
                    <strong className="text-charcoal-300">{analysis.stats.avgSentenceLength}</strong> {t("stats.avgSentence")}
                  </span>
                  {analysis.stats.placeholders.length > 0 && (
                    <span>
                      <strong className="text-amber-400">{analysis.stats.placeholders.length}</strong> {t("stats.variables")}
                    </span>
                  )}
                  {analysis.stats.sections.length > 0 && (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <BookOpen className="h-3.5 w-3.5" />
                      {analysis.stats.sections.slice(0, 4).join(", ")}
                    </span>
                  )}
                </div>
              </Card>

              {/* Issues */}
              {analysis.issues.length > 0 && (
                <Card glass className="p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal-100 mb-4">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    {t("issuesTitle")}
                  </h2>
                  <div className="space-y-2.5">
                    {analysis.issues.map((issue, i) => {
                      const meta = severityMeta[issue.severity];
                      const Icon = meta.icon;
                      return (
                        <div
                          key={`${issue.code}-${i}`}
                          className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 ${meta.cls}`}
                        >
                          <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-charcoal-200 leading-relaxed">{issue.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Strengths */}
              {analysis.strengths.length > 0 && (
                <Card glass className="p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal-100 mb-3">
                    <ThumbsUp className="h-4 w-4 text-emerald-400" />
                    {t("strengthsTitle")}
                  </h2>
                  <ul className="space-y-1.5">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-charcoal-300">
                        <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Improvements + Fix */}
              <Card glass className="p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal-100 mb-3">
                  <Wand2 className="h-4 w-4 text-sky-400" />
                  {t("improvementsTitle")}
                </h2>
                <ul className="space-y-1.5 mb-5">
                  {analysis.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-charcoal-300">
                      <span className="text-emerald-400 mt-0.5">→</span>
                      {imp}
                    </li>
                  ))}
                </ul>
                <Button variant="primary" onClick={handleFix} loading={fixing}>
                  {!fixing && <Sparkles className="h-4 w-4" />}
                  {t("fixMyPrompt")}
                </Button>
              </Card>
            </div>
          )}

          {/* Comparison */}
          {analysis && fix && (
            <Card glass className="p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal-100">
                  <GitBranch className="h-4 w-4 text-emerald-400" />
                  {t("comparisonTitle")}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={() => copyText("improved", fix.improved)}>
                    {copiedId === "improved" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {t("copy")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleSave} disabled={!isSignedIn}>
                    <Save className="h-3.5 w-3.5" />
                    {t("save")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReplace}
                    disabled={!isSignedIn || !sourcePromptId || !canEditSource}
                    title={!sourcePromptId ? t("replaceFromLibraryHint") : undefined}
                  >
                    <Replace className="h-3.5 w-3.5" />
                    {t("replace")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCreateVersion}
                    disabled={!isSignedIn || !sourcePromptId || !canEditSource}
                    title={!sourcePromptId ? t("replaceFromLibraryHint") : undefined}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    {t("createVersion")}
                  </Button>
                </div>
              </div>

              {!sourcePromptId && isSignedIn && (
                <p className="text-xs text-charcoal-500 mb-3">{t("replaceHint")}</p>
              )}
              {actionMsg && <p className="text-xs text-emerald-400 mb-3">{actionMsg}</p>}

              {/* Changes */}
              <div className="flex flex-wrap gap-2 mb-4">
                {fix.changes.map((c, i) => (
                  <Badge
                    key={i}
                    variant={c.type === "removed" ? "default" : "emerald"}
                    size="sm"
                  >
                    {c.label}
                  </Badge>
                ))}
              </div>

              {/* Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-charcoal-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-charcoal-900/60 border-b border-charcoal-800">
                    <span className="text-xs font-medium text-charcoal-400">{t("originalPrompt")}</span>
                    <button
                      onClick={() => copyText("original", content)}
                      className="p-1.5 rounded-lg hover:bg-charcoal-800 transition-all"
                    >
                      {copiedId === "original" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-charcoal-500" />
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs text-charcoal-300 p-4 max-h-80 overflow-auto">
                    {content}
                  </pre>
                </div>
                <div className="rounded-xl border border-emerald-500/25 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/25">
                    <span className="text-xs font-medium text-emerald-400">{t("improvedPrompt")}</span>
                    <button
                      onClick={() => copyText("improved", fix.improved)}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-all"
                    >
                      {copiedId === "improved" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-charcoal-500" />
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs text-charcoal-200 p-4 max-h-80 overflow-auto">
                    {fix.improved}
                  </pre>
                </div>
              </div>
            </Card>
          )}

          {/* History */}
          {isSignedIn && (
            <Card glass className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal-100">
                  <History className="h-4 w-4 text-charcoal-400" />
                  {t("historyTitle")}
                </h2>
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("clearHistory")}
                  </Button>
                )}
              </div>

              {!historyEnabled ? (
                <div className="flex items-start gap-3 rounded-lg border border-charcoal-800 bg-charcoal-900/40 px-4 py-3">
                  <Lock className="h-4 w-4 text-charcoal-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-charcoal-300">{t("historyProUpsell")}</p>
                    <Link href="/pricing" className="text-xs text-emerald-400 hover:text-emerald-300 inline-block mt-1">
                      {t("upgrade")} →
                    </Link>
                  </div>
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-charcoal-600">{t("historyEmpty")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-charcoal-800 px-3.5 py-2.5 hover:border-charcoal-700 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-charcoal-200 truncate">{item.title}</p>
                        <p className="text-[11px] text-charcoal-600">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: scoreColor(item.overall) }}>
                        {item.overall}
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => loadHistoryItem(item)}>
                        {t("load")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </Container>
      </main>
      <Footer />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-charcoal-800 border border-charcoal-700 text-sm text-charcoal-100 shadow-lg">
          {toast}
        </div>
      )}

      {/* Library picker */}
      {libraryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setLibraryOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-charcoal-800 bg-charcoal-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-charcoal-100">{t("libraryModalTitle")}</h3>
              <button onClick={() => setLibraryOpen(false)} className="p-1 rounded-lg hover:bg-charcoal-800">
                <X className="h-4 w-4 text-charcoal-500" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
              <input
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder={t("librarySearch")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="max-h-72 overflow-auto flex flex-col gap-2">
              {loadingLibrary ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                </div>
              ) : filteredLibrary.length === 0 ? (
                <p className="text-center text-sm text-charcoal-600 py-8">{t("noPrompts")}</p>
              ) : (
                filteredLibrary.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickFromLibrary(p)}
                    className="text-start rounded-lg border border-charcoal-800 px-3.5 py-2.5 hover:border-emerald-500/30 hover:bg-charcoal-900/60 transition-all"
                  >
                    <p className="text-sm text-charcoal-200 truncate">{p.title}</p>
                    <p className="text-[11px] text-charcoal-500 truncate">
                      {p.description || p.tags.slice(0, 4).join(" #")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
