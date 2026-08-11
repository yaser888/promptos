import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const PERIODS = ["monthly", "yearly", "one_time", "custom"];

function validatePlanBody(body: any): string | null {
  if (body.name !== undefined && (!body.name || typeof body.name !== "string")) {
    return "Name is required";
  }
  if (body.key !== undefined && typeof body.key === "string") {
    const key = body.key.trim().toUpperCase().replace(/\s+/g, "_");
    if (!/^[A-Z0-9_]{2,32}$/.test(key)) {
      return "Key must be 2-32 chars of A-Z, 0-9 or underscores";
    }
  }
  if (body.period !== undefined && !PERIODS.includes(body.period)) {
    return "Invalid period";
  }
  if (body.price !== undefined && (typeof body.price !== "number" || body.price < 0)) {
    return "Price must be a non-negative number";
  }
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await req.json();
    const validationError = validatePlanBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (body.key !== undefined && typeof body.key === "string") {
      const key = body.key.trim().toUpperCase().replace(/\s+/g, "_");
      const clash = await prisma.plan.findUnique({ where: { key } });
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: `A plan with key "${key}" already exists` },
          { status: 409 }
        );
      }
      body.key = key;
    }

    if (body.isDefault === true) {
      await prisma.plan.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.key !== undefined) data.key = body.key;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.price !== undefined) data.price = body.price;
    if (body.period !== undefined) data.period = body.period;
    if (body.stripePriceId !== undefined) data.stripePriceId = body.stripePriceId || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.isDefault !== undefined) data.isDefault = body.isDefault;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    if (Array.isArray(body.features)) {
      await prisma.planFeature.deleteMany({ where: { planId: id } });
      data.features = {
        create: body.features
          .map((f: any) => (typeof f === "string" ? f : f?.name))
          .filter((n: any): n is string => typeof n === "string" && n.trim().length > 0)
          .map((name: string, i: number) => ({ name: name.trim(), sortOrder: i })),
      };
    }

    const plan = await prisma.plan.update({
      where: { id },
      data,
      include: { features: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error("Error updating plan:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update plan";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default plan" },
        { status: 400 }
      );
    }

    await prisma.plan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting plan:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to delete plan";
    return NextResponse.json({ error: message }, { status });
  }
}
