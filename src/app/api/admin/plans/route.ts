import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const PERIODS = ["monthly", "yearly", "one_time", "custom"];

function validatePlanBody(body: any): string | null {
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return "Name is required";
  }
  if (!body.key || typeof body.key !== "string" || !body.key.trim()) {
    return "Key is required";
  }
  const key = body.key.trim().toUpperCase().replace(/\s+/g, "_");
  if (!/^[A-Z0-9_]{2,32}$/.test(key)) {
    return "Key must be 2-32 chars of A-Z, 0-9 or underscores";
  }
  if (body.period && !PERIODS.includes(body.period)) {
    return "Invalid period";
  }
  if (body.price !== undefined && (typeof body.price !== "number" || body.price < 0)) {
    return "Price must be a non-negative number";
  }
  return null;
}

export async function GET() {
  try {
    await requireAdmin();

    const [plans, subscriptionCounts] = await Promise.all([
      prisma.plan.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          features: { orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.subscription.groupBy({
        by: ["plan"],
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map(
      subscriptionCounts.map((s) => [s.plan, s._count._all])
    );

    const enriched = plans.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      price: p.price,
      period: p.period,
      stripePriceId: p.stripePriceId,
      isActive: p.isActive,
      isDefault: p.isDefault,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      features: p.features,
      subscribers: countMap.get(p.key as any) ?? 0,
    }));

    return NextResponse.json({ plans: enriched });
  } catch (error: any) {
    console.error("Error fetching plans:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch plans";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validationError = validatePlanBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const key = body.key.trim().toUpperCase().replace(/\s+/g, "_");

    const existing = await prisma.plan.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json(
        { error: `A plan with key "${key}" already exists` },
        { status: 409 }
      );
    }

    const features: string[] = Array.isArray(body.features) ? body.features : [];

    if (body.isDefault) {
      await prisma.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const plan = await prisma.plan.create({
      data: {
        key,
        name: body.name.trim(),
        description: body.description || null,
        price: typeof body.price === "number" ? body.price : 0,
        period: body.period || "monthly",
        stripePriceId: body.stripePriceId || null,
        isActive: body.isActive !== false,
        isDefault: body.isDefault === true,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        features: {
          create: features.map((name, i) => ({
            name: name.trim(),
            sortOrder: i,
          })),
        },
      },
      include: { features: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating plan:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to create plan";
    return NextResponse.json({ error: message }, { status });
  }
}
