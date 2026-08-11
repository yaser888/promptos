"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  Bot,
  Check,
  Copy,
  Save,
  RefreshCw,
  Pencil,
  Sparkles,
  BarChart3,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Target,
} from "lucide-react";
import { useAuthUser } from "@/components/providers/auth-provider";
import { cn } from "@/utils/cn";

type QuestionType = "text" | "select" | "multiSelect";

interface GoalQuestion {
  id: string;
  section: "context" | "audience" | "constraints" | "requirements" | "output";
  type: QuestionType;
  prompt: string;
  options?: string[];
  placeholder?: string;
  required: boolean;
}

interface QuestionSet {
  goal: string;
  summary: string;
  insights: {
    categoryLabel: string;
    detectedPlatforms: string[];
    detectedCountry?: string;
    detectedBusinessType?: string;
  };
  questions: GoalQuestion[];
}

interface Blueprint {
  goal: string;
  context: string[];
  audience: string[];
  constraints: string[];
  requirements: string[];
  outputFormat: string[];
}

interface BuildResult {
  title: string;
  summary: string;
  blueprint: Blueprint;
  prompt: string;
  variation: number;
}

interface AnalysisIssue {
  severity: "critical" | "warning" | "info";
  message: string;
}

interface Analysis {
  overall: number;
  issues: AnalysisIssue[];
}

type AnswerMap = Record<string, string | string[]>;

const LANGUAGE_CODES: Record<string, string> = {
  English: "en",
  "العربية": "ar",
  "Français": "fr",
  "Español": "es",
  "Deutsch": "de",
  "Türkçe": "tr",
  "Русский": "ru",
  "日本語": "ja",
  "한국어": "ko",
  "中文": "zh",
};

const PLATFORM_SLUGS: Record<string, string> = {
  ChatGPT: "CHATGPT",
  Claude: "CLAUDE",
  Gemini: "GEMINI",
  Perplexity: "PERPLEXITY",
  Cursor: "CURSOR",
  Copilot: "GITHUB_COPILOT",
  Midjourney: "MIDJOURNEY",
  "Stable Diffusion": "STABLE_DIFFUSION",
};

const TONE_SLUGS: Record<string, string> = {
  Professional: "PROFESSIONAL",
  Friendly: "FRIENDLY",
  Creative: "CREATIVE",
  Authoritative: "FORMAL",
  Casual: "CASUAL",
  Inspiring: "CUSTOM",
  Technical: "TECHNICAL",
  Persuasive: "PERSUASIVE",
};

const LENGTH_SLUGS: Record<string, string> = {
  Short: "SHORT",
  Medium: "MEDIUM",
  Detailed: "LONG",
};

const FORMAT_SLUGS: Record<string, string> = {
  "Step-by-step guide": "LIST",
  "Markdown document": "MARKDOWN",
  "Bullet points": "LIST",
  Table: "TABLE",
  "Plain text": "TEXT",
  JSON: "JSON",
  HTML: "HTML",
};

type Step = "goal" | "questions" | "result";

function firstString(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value[0] ?? "";
  return value;
}

function answerText(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.filter((v) => v.trim() !== "").join(", ");
  return value.trim();
}

export default function AutopilotPage() {
  const t = useTranslations("autopilot");
    const locale = useLocale();
  const { isSignedIn } = useAuthUser();

  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState("");
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<BuildResult | null>(null);
  const [promptText, setPromptText] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [building, setBuilding] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const missingRequired = useMemo(() => {
    if (!questionSet) return [];
    const empty = (value: string | string[] | undefined) =>
      value === undefined ||
      (Array.isArray(value) ? value.length === 0 || value.every((v) => v.trim() === "") : value.trim() === "");
    return questionSet.questions.filter((q) => q.required && empty(answers[q.id])).map((q) => q.id);
  }, [questionSet, answers]);

  const handleStart = async () => {
    const text = goal.trim();
    if (!text) {
      setError(t("goalError"));
      return;
    }
    setError(null);
    setLoadingQuestions(true);
    try {
      const res = await fetch("/api/prompt-autopilot/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("goalError"));
        return;
      }
      setQuestionSet(data);
      setAnswers({});
      setAnalysis(null);
      setResult(null);
      setStep("questions");
    } catch {
      setError(t("goalError"));
    } finally {
      setLoadingQuestions(false);
    }
  };

  const setAnswer = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectToggle = (id: string, option: string) => {
    const current = answers[id];
    if (typeof current === "string" && current === option) {
      const next = { ...answers };
      delete next[id];
      setAnswers(next);
      return;
    }
    setAnswer(id, option);
  };

  const handleMultiToggle = (id: string, option: string) => {
    const current = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
    const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
    setAnswer(id, next.length > 0 ? next : "");
  };

  const runBuild = async (variation: number) => {
    if (!questionSet) return;
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/prompt-autopilot/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: questionSet.goal, answers, variation }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422) setError(t("missingAnswers"));
        else setError(data.error || t("buildError"));
        return null;
      }
      return data as BuildResult;
    } catch {
      setError(t("buildError"));
      return null;
    } finally {
      setBuilding(false);
    }
  };

  const handleBuild = async () => {
    const built = await runBuild(0);
    if (!built) return;
    setResult(built);
    setPromptText(built.prompt);
    setPromptTitle(built.title);
    setAnalysis(null);
    setStep("result");
  };

  const handleRegenerate = async () => {
    if (!result) return;
    const built = await runBuild(result.variation + 1);
    if (!built) return;
    setResult(built);
    setPromptText(built.prompt);
    setPromptTitle(built.title);
    setAnalysis(null);
    showToast(t("regenerated"));
  };

  const handleOptimize = async () => {
    const content = promptText.trim();
    if (!content) return;
    setOptimizing(true);
    setError(null);
    try {
      const res = await fetch("/api/prompt-doctor/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: promptTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(t("optimizeError"));
        return;
      }
      setPromptText(data.improved);
      if (result) setResult({ ...result, prompt: data.improved });
      showToast(t("optimized"));
    } catch {
      showToast(t("optimizeError"));
    } finally {
      setOptimizing(false);
    }
  };

  const handleAnalyze = async () => {
    const content = promptText.trim();
    if (!content) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/prompt-doctor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: promptTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(t("analysisError"));
        return;
      }
      setAnalysis({ overall: data.overall, issues: data.issues });
    } catch {
      showToast(t("analysisError"));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      showToast(t("copied"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(t("copied"));
    }
  };

  const handleSave = async () => {
    if (!result || !isSignedIn) return;
    const answersArray = (answers.platform as string[]) ?? [];
    const platform =
      questionSet?.insights.detectedPlatforms[0] ||
      answersArray[0] ||
      firstString(answers.platform) ||
      "GENERIC";
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: promptTitle,
          content: promptText,
          description: result.summary,
          platform: PLATFORM_SLUGS[platform] || "GENERIC",
          tone: TONE_SLUGS[firstString(answers.tone) || ""] || "PROFESSIONAL",
          language: LANGUAGE_CODES[firstString(answers.language) || ""] || locale,
          complexity: "INTERMEDIATE",
          length: LENGTH_SLUGS[firstString(answers.length) || ""] || "MEDIUM",
          outputFormat:
            FORMAT_SLUGS[firstString(answers.outputFormat) || ""] || "MARKDOWN",
          tags: ["autopilot", questionSet?.insights.categoryLabel ?? "general"],
          isPublic: false,
        }),
      });
      if (!res.ok) {
        showToast(t("saveError"));
        return;
      }
      showToast(t("saved"));
    } catch {
      showToast(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16">
        <Container>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                <Bot className="h-6 w-6 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-charcoal-100">{t("title")}</h1>
            </div>
            <p className="text-charcoal-400 mt-2">{t("subtitle")}</p>
          </div>

          {step === "goal" && (
            <Card glass className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-300 mb-1.5">
                    {t("goalLabel")}
                  </label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder={t("goalPlaceholder")}
                    rows={4}
                    className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-y leading-relaxed"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button variant="primary" onClick={handleStart} loading={loadingQuestions}>
                  {!loadingQuestions && <Sparkles className="h-4 w-4" />}
                  {t("start")}
                </Button>
              </div>
            </Card>
          )}

          {step === "questions" && questionSet && (
            <div className="space-y-5">
              <Card glass className="p-5">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge>{t("detectionTitle")}</Badge>
                  <Badge variant="outline">{questionSet.insights.categoryLabel}</Badge>
                  {questionSet.insights.detectedPlatforms.map((p) => (
                    <Badge key={p} variant="outline">
                      {p}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-charcoal-300 mb-4">{t("questionsHint")}</p>
                <div className="space-y-5">
                  {questionSet.questions.map((q) => {
                    const current = answers[q.id];
                    const missing = missingRequired.includes(q.id);
                    return (
                      <div key={q.id} className={cn("rounded-lg border p-4", missing ? "border-red-500/40" : "border-charcoal-700/60")}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <label className="text-sm font-medium text-charcoal-200">
                            {t.has(`q.${q.id}`) ? t(`q.${q.id}`) : q.prompt}
                            {q.required && (
                              <span className="text-red-400 ms-1.5 text-xs">* {t("requiredMark")}</span>
                            )}
                          </label>
                        </div>
                        {q.type === "text" && (
                          <input
                            value={answerText(current)}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            placeholder={q.placeholder}
                            className={cn(
                              "flex h-10 w-full rounded-lg border bg-charcoal-900/50 px-3 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:outline-none focus:ring-2 transition-all",
                              missing ? "border-red-500/40 focus:border-red-500/50" : "border-charcoal-700 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                            )}
                          />
                        )}
                        {q.type === "select" && q.options && (
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((option) => {
                              const active = current === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleSelectToggle(q.id, option)}
                                  className={cn(
                                    "rounded-lg border px-3 py-1.5 text-sm transition-all",
                                    active
                                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                                      : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500"
                                  )}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {q.type === "multiSelect" && q.options && (
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((option) => {
                              const active = Array.isArray(current) && current.includes(option);
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleMultiToggle(q.id, option)}
                                  className={cn(
                                    "rounded-lg border px-3 py-1.5 text-sm transition-all",
                                    active
                                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                                      : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500"
                                  )}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <Button variant="secondary" onClick={() => setStep("goal")}>
                    <ArrowLeft className="h-4 w-4" />
                    {t("editGoal")}
                  </Button>
                  <Button variant="primary" onClick={handleBuild} loading={building} disabled={missingRequired.length > 0}>
                    {!building && <Target className="h-4 w-4" />}
                    {t("build")}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-5">
              <Card glass className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-charcoal-100">{t("resultTitle")}</h2>
                    <p className="text-sm text-charcoal-400 mt-1">{result.summary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => setStep("questions")} loading={building}>
                      {!building && <Pencil className="h-4 w-4" />}
                      {t("editAnswers")}
                    </Button>
                    <Button variant="secondary" onClick={handleRegenerate} loading={building}>
                      {!building && <RefreshCw className="h-4 w-4" />}
                      {t("regenerate")}
                    </Button>
                    <Button variant="secondary" onClick={handleOptimize} loading={optimizing}>
                      {!optimizing && <Sparkles className="h-4 w-4" />}
                      {t("optimize")}
                    </Button>
                    <Button variant="secondary" onClick={handleAnalyze} loading={analyzing}>
                      {!analyzing && <BarChart3 className="h-4 w-4" />}
                      {t("analyze")}
                    </Button>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-2">
                    {t("blueprintTitle")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(
                      [
                        ["goal", result.blueprint.goal],
                        ["context", result.blueprint.context.join(" • ")],
                        ["audience", result.blueprint.audience.join(" • ")],
                        ["constraints", result.blueprint.constraints.join(" • ")],
                        ["requirements", result.blueprint.requirements.join(" • ")],
                        ["output", result.blueprint.outputFormat.join(" • ")],
                      ] as Array<[string, string]>
                    ).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-charcoal-700/60 p-3">
                        <p className="text-xs font-medium text-emerald-400 mb-1">
                          {t(`bp.${key}`)}
                        </p>
                        <p className="text-sm text-charcoal-300">{value || "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                    placeholder={t("promptTitleLabel")}
                    className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={14}
                    className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-y font-mono leading-relaxed"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="primary" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {t("copy")}
                    </Button>
                    <Button variant="primary" onClick={handleSave} loading={saving} disabled={!isSignedIn}>
                      {!saving && <Save className="h-4 w-4" />}
                      {t("save")}
                    </Button>
                    {!isSignedIn && <p className="text-xs text-charcoal-500">{t("requiresLogin")}</p>}
                  </div>
                </div>

                {analysis && (
                  <Card className="mt-5 p-4 border-amber-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <BarChart3 className="h-4 w-4 text-amber-400" />
                      <p className="text-sm font-medium text-charcoal-200">{t("analysisTitle")}</p>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-charcoal-100">{analysis.overall}</span>
                      <span className="text-sm text-charcoal-400">{t("qualityScore")} / 100</span>
                    </div>
                    {analysis.issues.length > 0 && (
                      <ul className="space-y-1.5">
                        {analysis.issues.slice(0, 4).map((issue, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-charcoal-300">
                            {issue.severity === "critical" ? (
                              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                            ) : issue.severity === "warning" ? (
                              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                            )}
                            <span>{issue.message}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                )}
              </Card>
            </div>
          )}

          {toast && (
            <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300 backdrop-blur">
                <Check className="h-4 w-4" />
                {toast}
              </div>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}