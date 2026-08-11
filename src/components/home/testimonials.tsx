"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useHomeContent } from "@/components/providers/home-content-provider";

export function Testimonials() {
  const t = useTranslations("home");
  const { content } = useHomeContent();
  const testimonials = content.testimonials;
  const [current, setCurrent] = useState(0);

  if (testimonials.length === 0) return null;

  const safeCurrent = Math.min(current, testimonials.length - 1);

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-[100px]" />
      </div>

      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-100">
            {content.testimonialsTitle || t("testimonialsTitle")}
          </h2>
          <p className="mt-4 text-lg text-charcoal-400">
            {content.testimonialsSubtitle || t("testimonialsSubtitle")}
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden min-h-[280px]">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={safeCurrent}
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Card glass className="p-8 md:p-10 text-center">
                  <Quote className="h-8 w-8 text-emerald-500/30 mx-auto mb-6" />
                  <p className="text-lg text-charcoal-200 leading-relaxed mb-8 italic">
                    &ldquo;{testimonials[safeCurrent].content}&rdquo;
                  </p>
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold">
                      {testimonials[safeCurrent].avatar}
                    </div>
                    <div className="text-start">
                      <p className="text-sm font-semibold text-charcoal-100">
                        {testimonials[safeCurrent].name}
                      </p>
                      <p className="text-xs text-charcoal-500">
                        {testimonials[safeCurrent].role} &middot; {testimonials[safeCurrent].company}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setCurrent(safeCurrent === 0 ? testimonials.length - 1 : safeCurrent - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-800 text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-700 transition-all border border-charcoal-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === safeCurrent ? "w-8 bg-emerald-500" : "w-2 bg-charcoal-700 hover:bg-charcoal-600"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrent((safeCurrent + 1) % testimonials.length)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-800 text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-700 transition-all border border-charcoal-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
