import { NextRequest, NextResponse } from "next/server";
import { getServerSession, createDemoSession, clearDemoSession, clerkEnabled } from "@/lib/server-auth";

function safeRedirectPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  try {
    const parsed = new URL(raw, "http://local");
    return parsed.pathname + parsed.search;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const key = searchParams.get("key");

  if (clerkEnabled) {
    return NextResponse.json(
      { error: "Clerk authentication is enabled. Use Clerk sign-in." },
      { status: 400 }
    );
  }

  if (role === "admin") {
    const accessKey = process.env.ADMIN_ACCESS_KEY;
    if (!accessKey || key !== accessKey) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const user = await createDemoSession("admin");
    if (!user) {
      return NextResponse.json(
        { error: "Demo account not found. Run prisma db seed first." },
        { status: 404 }
      );
    }
    const redirectTo = safeRedirectPath(searchParams.get("redirect")) || "/admin";
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  if (role === "user") {
    const user = await createDemoSession("user");
    if (!user) {
      return NextResponse.json(
        { error: "Demo account not found. Run prisma db seed first." },
        { status: 404 }
      );
    }
    const redirectTo = safeRedirectPath(searchParams.get("redirect")) || "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  if (role === "signout") {
    await clearDemoSession();
    return NextResponse.redirect(new URL("/", req.url));
  }

  const session = await getServerSession();
  return NextResponse.json({ isSignedIn: !!session.user, user: session.user });
}

export async function DELETE() {
  await clearDemoSession();
  return NextResponse.json({ signedOut: true });
}
