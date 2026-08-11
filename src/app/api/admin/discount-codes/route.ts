import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const codes = await prisma.discountCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ codes });
  } catch (error: any) {
    console.error("Error fetching discount codes:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch discount codes";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    if (!body.code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    const value = parseFloat(body.discountValue);
    if (isNaN(value) || value <= 0) {
      return NextResponse.json({ error: "Invalid discount value" }, { status: 400 });
    }

    const existing = await prisma.discountCode.findUnique({
      where: { code: body.code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "This code already exists" }, { status: 409 });
    }

    const code = await prisma.discountCode.create({
      data: {
        code: body.code.toUpperCase(),
        description: body.description || null,
        discountType: body.discountType === "FIXED" ? "FIXED" : "PERCENTAGE",
        discountValue: value,
        maxUses: body.maxUses ? parseInt(body.maxUses) : null,
      },
    });

    return NextResponse.json({ code });
  } catch (error: any) {
    console.error("Error creating discount code:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to create discount code";
    return NextResponse.json({ error: message }, { status });
  }
}
