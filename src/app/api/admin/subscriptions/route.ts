import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (plan && plan !== "All") {
      where.plan = plan as any;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return NextResponse.json({ subscriptions, total });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch subscriptions";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();

    const subscription = await prisma.subscription.update({
      where: { id: body.id },
      data: {
        plan: body.plan as any,
        status: body.status as any,
      },
    });

    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update subscription";
    return NextResponse.json({ error: message }, { status });
  }
}
