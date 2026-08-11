import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const secret =
    process.env.CRON_SECRET || process.env.ADMIN_ACCESS_KEY || "";
  return secret !== "" && token === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.blogSchedule
      .update({
        where: { id: "default" },
        data: { enabled: false },
      })
      .catch(() => {});
    return NextResponse.json({
      published: false,
      reason: "auto_publishing_disabled",
    });
  } catch {
    return NextResponse.json({ published: false, reason: "error" }, { status: 500 });
  }
}
