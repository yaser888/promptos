"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/components/providers/auth-provider";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Save,
  ArrowRight,
  Clock,
  Trash2,
  WandSparkles,
  Loader2,
  LogIn,
} from "lucide-react";
import Link from "next/link";

const platforms = [
  { value: "CHATGPT", label: "ChatGPT" },
  { value: "CLAUDE", label: "Claude" },
  { value: "GEMINI", label: "Gemini" },
  { value: "GROK", label: "Grok" },
  { value: "PERPLEXITY", label: "Perplexity" },
  { value: "CURSOR", label: "Cursor" },
  { value: "GITHUB_COPILOT", label: "GitHub Copilot" },
  { value: "MIDJOURNEY", label: "Midjourney" },
  { value: "STABLE_DIFFUSION", label: "Stable Diffusion" },
  { value: "FLUX", label: "Flux" },
  { value: "LEONARDO", label: "Leonardo AI" },
  { value: "RUNWAY", label: "Runway" },
  { value: "SORA", label: "Sora" },
  { value: "GENERIC", label: "Generic" },
];

const tones = [
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "CASUAL", label: "Casual" },
  { value: "CREATIVE", label: "Creative" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "FORMAL", label: "Formal" },
  { value: "FRIENDLY", label: "Friendly" },
  { value: "HUMOROUS", label: "Humorous" },
  { value: "PERSUASIVE", label: "Persuasive" },
  { value: "NEUTRAL", label: "Neutral" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "tr", label: "Turkish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
];

const complexities = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

const lengths = [
  { value: "SHORT", label: "Short (1-2 sentences)" },
  { value: "MEDIUM", label: "Medium (1 paragraph)" },
  { value: "LONG", label: "Long (2-3 paragraphs)" },
  { value: "VERY_LONG", label: "Very Long (4+ paragraphs)" },
];

const outputFormats = [
  { value: "MARKDOWN", label: "Markdown" },
  { value: "JSON", label: "JSON" },
  { value: "TEXT", label: "Plain Text" },
  { value: "HTML", label: "HTML" },
  { value: "CSV", label: "CSV" },
  { value: "CODE", label: "Code" },
  { value: "TABLE", label: "Table" },
  { value: "LIST", label: "List" },
  { value: "YAML", label: "YAML" },
  { value: "XML", label: "XML" },
];

type HistoryItem = {
  id: string;
  idea: string;
  platform: string;
  createdAt: string;
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}

export default function GeneratorPage() {
  const gt = useTranslations("generator");
  const { toast } = useToast();
  const { isSignedIn } = useAuthUser();

  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState("GENERIC");
  const [tone, setTone] = useState("PROFESSIONAL");
  const [language, setLanguage] = useState("en");
  const [complexity, setComplexity] = useState("INTERMEDIATE");
  const [length, setLength] = useState("MEDIUM");
  const [outputFormat, setOutputFormat] = useState("MARKDOWN");
  const [generated, setGenerated] = useState("");
  const [generatedPromptId, setGeneratedPromptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    if (!isSignedIn) return;
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/generator");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) loadHistory();
  }, [isSignedIn]);

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "Create an account to generate prompts.",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          platform,
          tone,
          language,
          complexity,
          length,
          outputFormat,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Generation failed");
      }

      const result = await res.json();
      setGenerated(result.content);
      setGeneratedPromptId(result.promptId);
      loadHistory();
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message || "Something went wrong",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLibrary = async () => {
    if (!generatedPromptId) return;
    try {
      const res = await fetch(`/api/prompts/${generatedPromptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      if (res.ok) {
        setSaved(true);
        toast({
          title: "Saved to library",
          description: "Your prompt is now public in your library.",
        });
      } else {
        throw new Error("Save failed");
      }
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e.message || "Something went wrong",
        variant: "error",
      });
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch("/api/generator", { method: "DELETE" });
      setHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Container>
      <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <WandSparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">{gt("title")}</span>
            </div>
            <h1 className="text-4xl font-bold text-charcoal-100 mb-4">
              {gt("title")}
            </h1>
            <p className="text-lg text-charcoal-400">
              {gt("subtitle")}
            </p>
          </div>

          {!isSignedIn && (
            <Card glass className="max-w-5xl mx-auto mb-8">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <LogIn className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-charcoal-200">
                      Sign in to generate
                    </p>
                    <p className="text-xs text-charcoal-500">
                      Create a free account to build, save, and organize prompts.
                    </p>
                  </div>
                </div>
                <Link href="/sign-in">
                  <Button variant="primary" size="sm">
                    Sign in
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card glass className="max-w-5xl mx-auto">
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <Textarea
                    label="Your Idea"
                    placeholder={gt("ideaPlaceholder")}
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    className="min-h-[140px]"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Select label={gt("platform")} value={platform} onChange={(e) => setPlatform(e.target.value)} options={platforms} />
                    <Select label={gt("tone")} value={tone} onChange={(e) => setTone(e.target.value)} options={tones} />
                    <Select label={gt("language")} value={language} onChange={(e) => setLanguage(e.target.value)} options={languages} />
                    <Select label={gt("complexity")} value={complexity} onChange={(e) => setComplexity(e.target.value)} options={complexities} />
                    <Select label={gt("length")} value={length} onChange={(e) => setLength(e.target.value)} options={lengths} />
                    <Select label={gt("outputFormat")} value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} options={outputFormats} />
                  </div>

                  <Button size="lg" className="w-full" onClick={handleGenerate} loading={loading} disabled={!idea.trim()}>
                    <Sparkles className="h-4 w-4" />
                    {loading ? gt("generating") : gt("generate")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {generated ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Badge variant="emerald">{gt("result")}</Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={handleGenerate}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={handleSaveToLibrary}>
                            {saved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-xl bg-charcoal-950 p-5 border border-charcoal-800 max-h-[500px] overflow-y-auto">
                        <pre className="text-sm text-charcoal-200 whitespace-pre-wrap font-mono leading-relaxed">
                          {generated}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" className="flex-1" onClick={handleSaveToLibrary}>
                          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                          {saved ? "Saved" : gt("saveToLibrary")}
                        </Button>
                        <Link href="/editor" className="flex-1">
                          <Button variant="secondary" size="sm" className="w-full">
                            <ArrowRight className="h-4 w-4" />
                            {gt("useInEditor")}
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-xl border-2 border-dashed border-charcoal-800 text-center p-8">
                      {loading ? (
                        <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
                      ) : (
                        <WandSparkles className="h-12 w-12 text-charcoal-700 mb-4" />
                      )}
                      <p className="text-sm text-charcoal-600 mb-2">
                        {loading ? "Crafting your prompt..." : "Your generated prompt will appear here"}
                      </p>
                      <p className="text-xs text-charcoal-700">
                        Fill in your idea and click generate
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          {isSignedIn && (history.length > 0 || historyLoading) && (
            <Card glass className="max-w-5xl mx-auto mt-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-charcoal-400" />
                    <h3 className="text-sm font-semibold text-charcoal-200">{gt("history")}</h3>
                  </div>
                  <Button variant="ghost" size="xs" onClick={handleClearHistory}>
                    <Trash2 className="h-3.5 w-3.5" />
                    {gt("clearHistory")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {historyLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    </div>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-charcoal-900/50 hover:bg-charcoal-800/50 cursor-pointer transition-all"
                        onClick={() => setIdea(item.idea)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-charcoal-200 truncate">{item.idea}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="default" size="sm">
                              {item.platform.toLowerCase()}
                            </Badge>
                            <span className="text-xs text-charcoal-600">{timeAgo(item.createdAt)}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon-sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
    </Container>
  );
}