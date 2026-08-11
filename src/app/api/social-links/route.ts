import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const links = await prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, label: true, url: true, icon: true, sortOrder: true },
    });
    return NextResponse.json({ links });
  } catch (error) {
    console.error("Error fetching social links:", error);
    return NextResponse.json({ links: [] });
  }
}
