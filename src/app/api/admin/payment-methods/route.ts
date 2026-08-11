import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const methods = await prisma.paymentMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ methods });
  } catch (error: any) {
    console.error("Error fetching payment methods:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch payment methods";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const name = String(body.name || "").trim();
    const code = String(body.code || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_");
    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const method = await prisma.paymentMethod.create({
      data: {
        name,
        code,
        description: body.description ? String(body.description).trim() : null,
        icon: body.icon ? String(body.icon).trim() : null,
        config: body.config && typeof body.config === "object" ? body.config : {},
        isActive: body.isActive === true,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      },
    });
    return NextResponse.json({ method }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating payment method:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A payment method with this name or code already exists" }, { status: 409 });
    }
    const status = error?.status || 500;
    return NextResponse.json({ error: status === 401 || status === 403 ? error.message : "Failed to create payment method" }, { status });
  }
}
