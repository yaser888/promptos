import { NextResponse } from "next/server";
import { runDailyTasks } from "@/engine/extensions/runtime";

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
    const results = await runDailyTasks();
    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
}
