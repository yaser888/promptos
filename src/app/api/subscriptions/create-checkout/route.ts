import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

function hasStripeKeys(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);
}

async function upgradeDirect(plan: PlanLike, user: { id: string }) {
  return prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: plan.id as any,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId: user.id,
      plan: plan.id as any,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

type PlanLike = { id: string; price: number };

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = req.nextUrl.searchParams.get("plan") || "PRO";
    const plan = Object.values(PLANS).find((p) => p.id === planId);
    if (!plan || plan.price === 0) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!hasStripeKeys()) {
      // Demo mode: upgrade the plan directly in the database
      const sub = await upgradeDirect(plan, dbUser);
      return NextResponse.json({ url: `/dashboard/subscription?upgraded=${plan.id}`, demo: true, subscription: sub });
    }

    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: (plan as any).stripePriceId, quantity: 1 }],
      metadata: { clerkId: dbUser.clerkId, plan: plan.id },
      customer_email: dbUser.email || undefined,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/dashboard/subscription`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, successUrl, cancelUrl } = await req.json();
    const plan = Object.values(PLANS).find((p) => p.id === planId);
    if (!plan || plan.price === 0) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: session.user.clerkId },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!hasStripeKeys()) {
      const sub = await upgradeDirect(plan, dbUser);
      return NextResponse.json({ demo: true, subscription: sub });
    }

    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: (plan as any).stripePriceId, quantity: 1 }],
      metadata: { clerkId: dbUser.clerkId, plan: plan.id },
      customer_email: dbUser.email || undefined,
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/pricing`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
