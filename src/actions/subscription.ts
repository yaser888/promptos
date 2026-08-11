"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/services/subscription.service";

export async function getSubscription() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return null;

  return SubscriptionService.getSubscription(user.id);
}

export async function cancelSubscription() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  return SubscriptionService.cancelSubscription(user.id);
}

export async function checkFeatureAccess(feature: string) {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return false;

  return SubscriptionService.checkAccess(user.id, feature);
}

export async function createCheckoutSession(planId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/create-checkout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create checkout");
  }

  return response.json();
}

export async function createPortalSession() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/portal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create portal session");
  }

  return response.json();
}
