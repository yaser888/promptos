"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useHomeContent } from "@/components/providers/home-content-provider";

interface PlanFeature {
  name: string;
  icon: string | null;
}

interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: number;
  period: string;
  isDefault: boolean;
  sortOrder: number;
  features: PlanFeature[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

export function Pricing() {
  const t = useTranslations("pricing");
  const common = useTranslations("common");
  const { content } = useHomeContent();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/plans", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.plans) setPlans(json.plans);
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const featureLabel = (name: string): string => {
    const key = `pricing.features.${name}`;
    const translated = t.has(key) ? t(key) : "";
    if (translated && translated !== key) return translated;
    return name
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

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
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-100">
            {content.pricingTitle || t("title")}
          </h2>
          <p className="mt-4 text-lg text-charcoal-400">
            {content.pricingSubtitle || t("subtitle")}
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              !yearly ? "text-charcoal-200" : "text-charcoal-600"
            )}
          >
            {common("monthly")}
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors duration-300",
              yearly ? "bg-emerald-500" : "bg-charcoal-700"
            )}
          >
            <div
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform duration-300",
                yearly ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              yearly ? "text-charcoal-200" : "text-charcoal-600"
            )}
          >
            {common("yearly")}
            <span className="ml-1.5 text-emerald-400 text-xs">-20%</span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <p className="text-center text-charcoal-500 py-16">{t("noPlans")}</p>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {plans.map((plan) => {
              const isCustom = plan.period === "custom" || plan.price <= 0;
              const highlighted = plan.sortOrder === 1;
              const price = isCustom
                ? null
                : yearly
                ? Math.round(plan.price * 12 * 0.8 * 100) / 100
                : plan.price;

              return (
                <motion.div key={plan.id} variants={itemVariants}>
                  <Card
                    glass
                    hover
                    className={cn(
                      "relative flex flex-col h-full",
                      highlighted && "border-emerald-500/30 bg-emerald-500/5"
                    )}
                  >
                    {highlighted && (
                      <Badge
                        variant="emerald"
                        size="sm"
                        className="absolute -top-2.5 end-4"
                      >
                        {t("mostPopular")}
                      </Badge>
                    )}

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-charcoal-100 mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-charcoal-500">
                        {plan.description}
                      </p>
                    </div>

                    {price !== null ? (
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-charcoal-100">
                          ${price.toLocaleString()}
                        </span>
                        <span className="text-sm text-charcoal-500 ml-1.5">
                          /{common(yearly ? "year" : "month")}
                        </span>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <span className="text-3xl font-bold text-charcoal-100">
                          {t("enterpriseCta")}
                        </span>
                      </div>
                    )}

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-sm text-charcoal-400">
                            {featureLabel(feature.name)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={highlighted ? "primary" : "secondary"}
                      className="w-full"
                      asChild
                    >
                      <Link
                        href={
                          isCustom ? "/contact" : `/sign-up?plan=${plan.key}`
                        }
                      >
                        {isCustom ? t("enterpriseCta") : t("choosePlan")}
                        {!isCustom && <ArrowRight className="h-4 w-4" />}
                      </Link>
                    </Button>

                    {!isCustom && (
                      <p className="text-xs text-charcoal-600 text-center mt-3">
                        {t("trialDays")} &middot; {t("noCommitment")}
                      </p>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </Container>
    </section>
  );
}
