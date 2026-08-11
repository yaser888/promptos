import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.setting.findFirst();
    return NextResponse.json({
      siteName: setting?.siteName || "PromptOS",
      tagline: setting?.tagline ?? setting?.siteDescription ?? null,
      logoUrl: setting?.logoUrl ?? null,
      supportEmail: setting?.supportEmail ?? null,
    });
  } catch (error: any) {
    console.error("Error fetching branding:", error);
    return NextResponse.json({ error: "Failed to fetch branding" }, { status: 500 });
  }
}
