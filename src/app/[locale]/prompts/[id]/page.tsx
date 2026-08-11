"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
  Layers,
  Share2,
  Code2,
  Star,
  CopyPlus,
} from "lucide-react";
import Link from "next/link";
import { useAuthUser } from "@/components/providers/auth-provider";

interface PromptDetail {
  id: string;
  title: string;
  content: string;
  description: string | null;
  platform: string;
  tone: string;
  language: string;
  complexity: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  category: { id: string; name: string; slug: string } | null;
  user: { name: string; avatar: string | null } | null;
}

export default function PromptDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const { isSignedIn } = useAuthUser();
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    fetch(`/api/prompts/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Prompt not found" : "Failed to load");
        return res.json();
      })
      .then((data) => {
        setPrompt(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load prompt");
        setLoading(false);
      });
  }, [params.id]);

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      fetch(`/api/prompts/${prompt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy" }),
      }).catch(() => {});
    } catch {}
  };

  const handleShare = async () => {
    if (!prompt) return;
    const url = `${window.location.origin}/prompts/${prompt.id}`;
    const text = `${prompt.title} — grab this AI prompt`;
    try {
      if (navigator.share) {
        await navigator.share({ title: prompt.title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
    fetch(`/api/prompts/${prompt.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "share" }),
    }).catch(() => {});
  };

  const embedCode = () =>
    `<iframe src="${window.location.origin}/api/embed/prompt-of-day" width="360" height="420" style="border:0;border-radius:16px;overflow:hidden" loading="lazy"></iframe>`;

  const handleRate = async (value: number) => {
    if (!prompt || !isSignedIn) return;
    setRatingMsg(null);
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rate", value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRatingMsg(err.error || "Failed to rate");
        return;
      }
      const data = await res.json();
      setMyRating(value);
      setPrompt((prev) => (prev ? { ...prev, ...data.prompt } : prev));
    } catch {
      setRatingMsg("Failed to rate");
    }
  };

  const handleDuplicate = async () => {
    if (!prompt || !isSignedIn) return;
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      if (res.ok) {
        const data = await res.json();
        window.open(`/prompts/${data.prompt?.id ?? prompt.id}`, "_blank");
      }
    } catch {}
  };

  const copyEmbed = () => {
    if (!prompt) return;
    navigator.clipboard
      .writeText(embedCode())
      .then(() => {
        setEmbedCopied(true);
        setTimeout(() => setEmbedCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen bg-surface">
        <Container>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : error || !prompt ? (
            <Card glass className="p-12 text-center">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-charcoal-300 mb-4">{error || "Prompt not found"}</p>
              <Link href="/library">
                <Button variant="secondary">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <Link href="/library" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                &larr; Back to Library
              </Link>

              <Card glass className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                        <Layers className="h-5 w-5 text-emerald-400" />
                      </div>
                      <Badge variant="emerald" size="sm">{prompt.platform}</Badge>
                      {prompt.category && (
                        <Badge variant="default" size="sm">{prompt.category.name}</Badge>
                      )}
                    </div>
                    <h1 className="text-xl font-bold text-charcoal-100 break-words">{prompt.title}</h1>
                    {prompt.description && (
                      <p className="text-sm text-charcoal-500 mt-2">{prompt.description}</p>
                    )}
                    {prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {prompt.tags.slice(0, 6).map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-charcoal-800 text-charcoal-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
<div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {prompt.ratingCount > 0 && (
                        <div
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                          title={`${prompt.rating.toFixed(1)} / 5`}
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold text-amber-300">
                            {prompt.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-amber-500/70">({prompt.ratingCount})</span>
                        </div>
                      )}
                      <Button variant="secondary" onClick={handleShare} className="shrink-0">
                        {shared ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Shared!
                          </>
                        ) : (
                          <>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </>
                        )}
                      </Button>
                      {isSignedIn && (
                        <Button variant="secondary" onClick={handleDuplicate} className="shrink-0">
                          <CopyPlus className="h-4 w-4 mr-2" />
                          Duplicate
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => setEmbedOpen(true)} className="shrink-0">
                        <Code2 className="h-4 w-4 mr-2" />
                        Embed
                      </Button>
                      <Button variant="primary" size="lg" onClick={handleCopy} className="shrink-0">
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Prompt
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {isSignedIn && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs text-charcoal-500 me-1">Rate:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110"
                          title={`${star} star${star > 1 ? "s" : ""}`}
                        >
                          <Star
                            className={`h-5 w-5 ${
                              star <= (hoverRating || myRating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-charcoal-600"
                            }`}
                          />
                        </button>
                      ))}
                      {ratingMsg && (
                        <span className="text-xs text-rose-400">{ratingMsg}</span>
                      )}
                      {!ratingMsg && myRating > 0 && (
                        <span className="text-xs text-emerald-400">Thanks for rating!</span>
                      )}
                    </div>
                  )}

                <div className="rounded-xl border border-charcoal-800 bg-charcoal-900/60 p-5">
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm text-charcoal-200 leading-relaxed">
                    {prompt.content}
                  </pre>
                </div>

                <div className="flex justify-end mt-4">
                  <Button variant="secondary" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Prompt
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {embedOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                  onClick={() => setEmbedOpen(false)}
                >
                  <div
                    className="w-full max-w-md rounded-2xl border border-charcoal-800 bg-charcoal-900 p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-charcoal-100 flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-emerald-400" />
                        Embed this prompt
                      </h3>
                      <button
                        onClick={() => setEmbedOpen(false)}
                        className="text-charcoal-500 hover:text-charcoal-200 transition-colors text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs text-charcoal-500 mb-3">
                      Paste this code anywhere on your blog, bio or website — it shows a live
                      &quot;Prompt of the Day&quot; card that updates daily.
                    </p>
                    <pre className="rounded-xl bg-charcoal-950 border border-charcoal-800 p-4 text-[11px] text-emerald-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                      {embedCode()}
                    </pre>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Button variant="secondary" size="sm" onClick={copyEmbed}>
                        {embedCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy code
                          </>
                        )}
                      </Button>
                      <iframe
                        src="/api/embed/prompt-of-day"
                        width={180}
                        height={220}
                        className="rounded-xl border border-charcoal-800"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
