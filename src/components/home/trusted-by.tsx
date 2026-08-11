"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { useHomeContent } from "@/components/providers/home-content-provider";

export function TrustedBy() {
  const t = useTranslations("home");
  const { content } = useHomeContent();
  const companies = content.companies;

  return (
    <section className="relative py-16 md:py-20">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      {companies.length > 0 && (
        <Container>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xs text-charcoal-600 uppercase tracking-widest font-medium mb-10">
              {content.trustedTitle || t("trustedByTitle")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {companies.map((company, i) => (
                <motion.div
                  key={company}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-charcoal-800">
                    <span className="text-xs font-bold text-emerald-400">
                      {company.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-charcoal-500 tracking-wide">
                    {company}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      )}
    </section>
  );
}
