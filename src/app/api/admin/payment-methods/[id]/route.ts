import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    const data: any = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      data.name = name;
    }
    if (body.code !== undefined) {
      const code = String(body.code).trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
      if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });
      data.code = code;
    }
    if (body.description !== undefined) data.description = String(body.description).trim() || null;
    if (body.icon !== undefined) data.icon = String(body.icon).trim() || null;
    if (body.config !== undefined && typeof body.config === "object") data.config = body.config;
    if (body.isActive !== undefined) data.isActive = body.isActive === true;
    if (body.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      data.sortOrder = Number(body.sortOrder);
    }

    const method = await prisma.paymentMethod.update({ where: { id }, data });
    return NextResponse.json({ method });
  } catch (error: any) {
    console.error("Error updating payment method:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A payment method with this name or code already exists" }, { status: 409 });
    }
    const status = error?.status || 500;
    return NextResponse.json({ error: status === 401 || status === 403 ? error.message : "Failed to update payment method" }, { status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    await prisma.paymentMethod.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error("Error deleting payment method:", error);
    const status = error?.status || 500;
    return NextResponse.json({ error: status === 401 || status === 403 ? error.message : "Failed to delete payment method" }, { status });
  }
}
