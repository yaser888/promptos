import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        features: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        price: p.price,
        period: p.period,
        isDefault: p.isDefault,
        sortOrder: p.sortOrder,
        features: p.features.map((f) => ({ name: f.name, icon: f.icon })),
      })),
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
