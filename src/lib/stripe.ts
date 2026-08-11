import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeInstance;
}

export { Stripe };

export const PLANS = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: 0,
    stripePriceId: process.env.STRIPE_PRICE_FREE || "",
    features: [
      "Limited daily prompts",
      "Basic prompt library access",
      "Save up to 50 prompts",
      "Copy and share prompts",
      "2 languages supported",
      "Basic cloud sync",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 10,
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    features: [
      "Unlimited prompts",
      "All optimization tools",
      "All templates",
      "All languages",
      "Full cloud sync",
      "All export formats",
      "Version history",
      "AI Prompt Optimizer",
      "AI Prompt Analyzer",
      "Priority support",
    ],
  },
  TEAM: {
    id: "TEAM",
    name: "Team",
    price: 25,
    stripePriceId: process.env.STRIPE_PRICE_TEAM || "",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "Project sharing",
      "User permissions",
      "Team analytics",
      "Activity log",
      "Admin dashboard",
    ],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 0,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || "",
    features: [
      "Everything in Team",
      "Custom API",
      "Dedicated hosting",
      "SSO",
      "Dedicated support",
      "Account manager",
      "Advanced security",
      "SLA",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanById(id: string) {
  return Object.values(PLANS).find((p) => p.id === id);
}

export function getPlanByStripePriceId(priceId: string) {
  return Object.values(PLANS).find((p) => p.stripePriceId === priceId);
}

export function planMonthlyPrice(planId: string): number {
  const plan = Object.values(PLANS).find((p) => p.id === planId);
  return plan?.price || 0;
}
