"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Mail, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HomeSectionItem {
  [key: string]: unknown;
}

interface HomeSectionData {
  extensionSlug: string;
  type: string;
  title: string;
  subtitle?: string;
  items: HomeSectionItem[];
}

function TopPrompts({ section }: { section: HomeSectionData }) {
  return (
    <section className="py-16">
      <Container>
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-5 w-5 text-amber-400" />
          <h2 className="text-2xl font-bold text-charcoal-100">{section.title}</h2>
        </div>
        {section.subtitle && <p className="text-sm text-charcoal-500 mb-6">{section.subtitle}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.items.map((item) => (
            <Link
              key={String(item.id)}
              href={`/prompts/${String(item.id)}`}
              className="group rounded-xl border border-charcoal-800/50 p-5 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-charcoal-100 line-clamp-1">{String(item.title)}</h3>
                <span className="inline-flex items-center gap-1 text-xs text-amber-400 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  {String(item.likeCount ?? 0)}
                </span>
              </div>
              {item.description ? (
                <p className="text-sm text-charcoal-500 mt-2 line-clamp-2">{String(item.description)}</p>
              ) : null}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Array.isArray(item.tags) &&
                  (item.tags as string[]).slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-charcoal-800/60 text-[11px] text-charcoal-400">
                      #{tag}
                    </span>
                  ))}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Browse the full library
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

function Newsletter({ section }: { section: HomeSectionData }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const subscribe = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErrorMsg("Enter a valid email address");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/extensions/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to subscribe");
      setStatus("error");
    }
  };

  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-charcoal-800/60 bg-gradient-to-r from-charcoal-900 via-charcoal-900 to-emerald-500/5 p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Newsletter
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-charcoal-100">{section.title}</h2>
              {section.subtitle && <p className="mt-2 text-sm text-charcoal-500">{section.subtitle}</p>}
            </div>
            <div className="w-full md:w-96 shrink-0">
              {status === "done" ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                  You&apos;re in! Check your inbox to confirm.
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg("");
                    }}
                    placeholder="you@example.com"
                    className="flex-1"
                  />
                  <Button onClick={subscribe} loading={status === "loading"}>
                    Subscribe
                  </Button>
                </div>
              )}
              {status === "error" && errorMsg && (
                <p className="text-xs text-red-400 mt-2">{errorMsg}</p>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function ExtensionHomeSections({
  sections: initial,
}: {
  sections?: HomeSectionData[];
}) {
  const [sections, setSections] = useState<HomeSectionData[] | null>(
    initial ?? null
  );

  useEffect(() => {
    if (initial) return;
    let active = true;
    fetch("/api/extensions/home-sections", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json?.sections) return;
        setSections(json.sections as HomeSectionData[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initial]);

  if (!sections || sections.length === 0) return null;

  return (
    <div className="relative">
      {sections.map((section) => {
        switch (section.type) {
          case "top-prompts":
            return <TopPrompts key={section.type} section={section} />;
          case "newsletter":
            return <Newsletter key={section.type} section={section} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
