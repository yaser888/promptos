import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

async function getOrCreateSetting() {
  let setting = await prisma.setting.findFirst();
  if (!setting) {
    setting = await prisma.setting.create({ data: {} });
  }
  return setting;
}

export async function GET() {
  try {
    await requireAdmin();
    const setting = await getOrCreateSetting();
    return NextResponse.json({
      siteName: setting.siteName,
      tagline: setting.tagline ?? setting.siteDescription ?? "",
      logoUrl: setting.logoUrl ?? "",
      supportEmail: setting.supportEmail ?? "",
    });
  } catch (error: any) {
    console.error("Error fetching branding:", error);
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 401 || status === 403 ? error.message : "Failed to fetch branding" },
      { status }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const setting = await getOrCreateSetting();

    const data: any = {};
    if (typeof body.siteName === "string") {
      const name = body.siteName.trim();
      if (!name) {
        return NextResponse.json({ error: "Site name is required" }, { status: 400 });
      }
      data.siteName = name;
    }
    if (typeof body.tagline === "string") data.tagline = body.tagline.trim();
    if (typeof body.supportEmail === "string") data.supportEmail = body.supportEmail.trim() || null;

    const updated = await prisma.setting.update({
      where: { id: setting.id },
      data,
    });

    return NextResponse.json({
      siteName: updated.siteName,
      tagline: updated.tagline ?? updated.siteDescription ?? "",
      logoUrl: updated.logoUrl ?? "",
      supportEmail: updated.supportEmail ?? "",
    });
  } catch (error: any) {
    console.error("Error updating branding:", error);
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 401 || status === 403 ? error.message : "Failed to update branding" },
      { status }
    );
  }
}
