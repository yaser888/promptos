"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { useHomeContent } from "@/components/providers/home-content-provider";

const bullets = [
  { icon: Zap },
  { icon: Shield },
  { icon: Sparkles },
];

export function CTASection() {
  const t = useTranslations("home");
  const { content } = useHomeContent();
  const cta = content.ctaBullets;

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent border border-emerald-500/10" />
          <div className="relative p-10 md:p-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal-100 mb-6 leading-tight">
              {content.ctaTitle || t("ctaTitle")}
            </h2>
            <p className="text-lg text-charcoal-400 mb-8 max-w-xl mx-auto">
              {content.ctaSubtitle || t("ctaSubtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Button size="xl" variant="primary" asChild>
                <Link href="/sign-up">
                  {content.ctaButton || t("ctaButton")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="secondary" asChild>
                <Link href="/pricing">
                  {content.ctaSecondary || t("ctaSecondary")}
                </Link>
              </Button>
            </div>

            {cta.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {cta.map((text, i) => {
                  const Icon = bullets[i % bullets.length].icon;
                  return (
                    <div key={`${text}-${i}`} className="flex items-center gap-2 text-sm text-charcoal-500">
                      <Icon className="h-4 w-4 text-emerald-400" />
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
