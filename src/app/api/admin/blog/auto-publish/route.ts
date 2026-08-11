import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    await prisma.blogSchedule
      .update({ where: { id: "default" }, data: { enabled: false } })
      .catch(() => {});
    return NextResponse.json(
      { published: false, reason: "auto_publishing_disabled" },
      { status: 200 }
    );
  } catch (error: any) {
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to auto-publish";
    return NextResponse.json({ error: message }, { status });
  }
}
