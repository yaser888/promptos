import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    let settings = await prisma.setting.findFirst();

    if (!settings) {
      settings = await prisma.setting.create({
        data: {},
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch settings";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { paymentGateways, ...rest } = body;

    let existing = await prisma.setting.findFirst();

    const updateData: any = { ...rest };

    if (rest.defaultPlan) {
      updateData.defaultPlan = rest.defaultPlan as any;
    }

    if (paymentGateways) {
      const current = existing?.metadata ? (existing.metadata as any) : {};
      updateData.metadata = { ...current, paymentGateways };
    }

    if (existing) {
      existing = await prisma.setting.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      existing = await prisma.setting.create({
        data: updateData,
      });
    }

    return NextResponse.json({ settings: existing });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status });
  }
}
