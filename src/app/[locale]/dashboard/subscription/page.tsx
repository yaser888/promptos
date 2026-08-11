"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, ArrowRight, Activity } from "lucide-react";

interface SubscriptionStatus {
  plan: string;
  status: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
}

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
  sortOrder: number;
  features: PlanFeature[];
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <Card glass className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </Card>
      <div>
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} glass className="p-5">
              <Skeleton className="h-5 w-16 rounded-full mb-3" />
              <Skeleton className="h-5 w-20 mb-1" />
              <Skeleton className="h-8 w-16 mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-full bg-red-500/10 p-3 mb-4">
        <Activity className="h-6 w-6 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-charcoal-200 mb-1">{t("error")}</h2>
      <p className="text-sm text-charcoal-500 mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("retry") || "Retry"}
      </Button>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubscriptionPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [data, setData] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setPlans(json?.plans ?? []))
      .catch(() => {});
  }, []);

  const fetchSubscription = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/subscriptions/status")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch subscription");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to open billing portal");
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else if (data.demo) router.push("/dashboard/subscription");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    }
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/create-checkout?plan=${planId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start checkout");
      }
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchSubscription} />;

  const currentPlanId = data?.plan?.toUpperCase() || "FREE";
  const planName = data?.plan || "Free";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-100">
          {t("subscription") || "Subscription"}
        </h1>
        <p className="text-charcoal-500 mt-1">
          Manage your plan and billing
        </p>
      </div>

      {data && (
        <Card glass className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-charcoal-100">
                  {t("currentPlan") || "Current Plan"}
                </h2>
                <Badge variant="emerald">{data.status}</Badge>
              </div>
              <p className="text-3xl font-bold text-charcoal-100 mb-1">
                {planName}
              </p>
              <p className="text-sm text-charcoal-500">
                {data.currentPeriodEnd
                  ? `Renews on ${formatDate(data.currentPeriodEnd)}`
                  : data.trialEnd
                    ? `Trial ends on ${formatDate(data.trialEnd)}`
                    : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <CreditCard className="h-4 w-4 mr-2" />
                {t("manageSubscription") || "Manage Subscription"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold text-charcoal-100 mb-4">
          {t("availablePlans") || "Available Plans"}
        </h2>
        {plans.length === 0 ? (
          <p className="text-sm text-charcoal-500">{t("noPlans") || "No plans available"}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.key === currentPlanId;
              const isCustom = plan.period === "custom" || plan.price <= 0;
              return (
                <Card
                  key={plan.id}
                  glass
                  hover
                  className={`p-5 ${
                    isCurrent
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : ""
                  }`}
                >
                  {isCurrent && (
                    <Badge variant="emerald" size="sm" className="mb-3">
                      {t("current") || "Current"}
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold text-charcoal-100 mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-charcoal-500 mb-3">{plan.description}</p>
                  <p className="text-2xl font-bold text-charcoal-100 mb-4">
                    {isCustom ? (t("custom") || "Custom") : `$${plan.price}`}
                    {!isCustom && (
                      <span className="text-sm font-normal text-charcoal-500">
                        /month
                      </span>
                    )}
                  </p>
                  {plan.features.length > 0 && (
                    <ul className="space-y-2 mb-4">
                      {plan.features.slice(0, 6).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-charcoal-400">
                          <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <span>
                            {f.name
                              .split("_")
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(" ")}
                          </span>
                        </li>
                      ))}
                      {plan.features.length > 6 && (
                        <li className="text-xs text-charcoal-600">
                          +{plan.features.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      <Check className="h-4 w-4" />
                      {t("currentPlan") || "Current Plan"}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => handleUpgrade(plan.key)}
                    >
                      {t("upgrade") || "Upgrade"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
