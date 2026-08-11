"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import Link from "next/link";
import { useHomeContent } from "@/components/providers/home-content-provider";

function useCountUp(end: string, duration: number = 2000) {
  const [count, setCount] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          const num = parseInt(end.replace(/[^0-9]/g, ""));
          if (isNaN(num)) { setCount(end); return; }
          const suffix = end.replace(/[0-9]/g, "");
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(progress * num);
            setCount(`${current}${suffix}`);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { ref, count };
}

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const { ref, count } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
        {count}
      </div>
      <div className="text-xs text-charcoal-600 mt-1 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

export function Hero() {
  const t = useTranslations("home");
  const { stats: liveStats, content } = useHomeContent();
  const hero = content.hero;
  const stats = content.stats.length > 0 ? content.stats : [];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-emerald-400/5 rounded-full blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Container className="relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              {hero.badge || t("heroBadge")}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight whitespace-pre-line leading-[1.1]"
          >
            <span className="text-charcoal-100">{hero.title || t("heroTitle")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-charcoal-400 max-w-2xl leading-relaxed"
          >
            {hero.subtitle || t("heroSubtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          >
            <Button size="xl" variant="primary" asChild>
              <Link href="/sign-up">
                {hero.cta || t("heroCta")}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="secondary" asChild>
              <Link href="/library">
                <Play className="h-5 w-5" />
                {hero.secondary || t("heroSecondary")}
              </Link>
            </Button>
          </motion.div>

          {hero.platforms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-16 w-full"
            >
              <p className="text-xs text-charcoal-600 uppercase tracking-widest font-medium mb-6">
                {t("heroPlatforms")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {hero.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="text-sm text-charcoal-600 hover:text-charcoal-400 transition-colors"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-12 flex items-center justify-center gap-8 sm:gap-12"
            >
              {stats.map((stat) => (
                <AnimatedStat
                  key={stat.valueKey}
                  value={
                    liveStats && liveStats[stat.valueKey] !== undefined
                      ? `${liveStats[stat.valueKey].toLocaleString()}${stat.suffix}`
                      : `0${stat.suffix}`
                  }
                  label={stat.label}
                />
              ))}
            </motion.div>
          )}
        </div>
      </Container>
    </section>
  );
}
