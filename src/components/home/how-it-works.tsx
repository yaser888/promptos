"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { useHomeContent } from "@/components/providers/home-content-provider";
import { homeIcon } from "@/components/home/icons";

const STEP_ICONS = ["bulb", "wand", "share", "rocket"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function HowItWorks() {
  const t = useTranslations("home");
  const { content } = useHomeContent();
  const steps = content.steps;

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
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
            {content.howTitle || t("howItWorksTitle")}
          </h2>
          <p className="mt-4 text-lg text-charcoal-400">
            {content.howSubtitle || t("howItWorksSubtitle")}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, index) => {
            const Icon = homeIcon(STEP_ICONS[index % STEP_ICONS.length]);
            return (
              <motion.div key={`${step.title}-${index}`} variants={itemVariants} className="relative">
                <Card glass hover className="h-full pt-8">
                  <div className="absolute -top-4 start-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-black text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 mb-5">
                    <Icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-charcoal-100 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-charcoal-400 leading-relaxed">
                    {step.description}
                  </p>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -end-3 w-6 h-px ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-emerald-500/40 to-transparent" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </section>
  );
}
