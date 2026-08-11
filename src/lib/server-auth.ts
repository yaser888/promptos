import { cookies } from "next/headers";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const DEMO_COOKIE = "promptos_demo_session";
const DEMO_ACCOUNTS: Record<string, string> = {
  admin: "seed_admin",
  user: "seed_user_1",
};

function demoSignerSecret(): string {
  return process.env.ADMIN_ACCESS_KEY || "promptos-demo-dev-secret";
}

function signClerkId(clerkId: string): string {
  return crypto.createHmac("sha256", demoSignerSecret()).update(clerkId).digest("hex").slice(0, 24);
}

function encodeDemoCookie(clerkId: string): string {
  return `${clerkId}.${signClerkId(clerkId)}`;
}

function decodeDemoCookie(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const clerkId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = signClerkId(clerkId);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0 ? clerkId : null;
}

export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export interface ServerSession {
  userId: string | null;
  clerkId: string | null;
  user: {
    id: string;
    clerkId: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export async function getServerSession(): Promise<ServerSession> {
  const empty: ServerSession = { userId: null, clerkId: null, user: null };

  if (clerkEnabled) {
    const { userId } = await clerkAuth();
    if (!userId) return empty;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, clerkId: true, name: true, email: true, role: true },
    });
    if (!user) return empty;
    return { userId, clerkId: userId, user };
  }

  try {
    const store = await cookies();
    const rawCookie = store.get(DEMO_COOKIE)?.value;
    const demoClerkId = rawCookie ? decodeDemoCookie(rawCookie) : null;
    if (!demoClerkId) return empty;

    const user = await prisma.user.findUnique({
      where: { clerkId: demoClerkId },
      select: { id: true, clerkId: true, name: true, email: true, role: true },
    });
    if (!user) return empty;
    return { userId: user.clerkId, clerkId: user.clerkId, user };
  } catch {
    return empty;
  }
}

export async function createDemoSession(role: "admin" | "user") {
  const clerkId = DEMO_ACCOUNTS[role];
  if (!clerkId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true, name: true, email: true, role: true },
  });
  if (!user) return null;

  const store = await cookies();
  store.set(DEMO_COOKIE, encodeDemoCookie(clerkId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return user;
}

export async function clearDemoSession() {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
}

export async function requireAdmin(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session.user || session.user.role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = session.user ? 403 : 401;
    throw err;
  }
  return session;
}

export async function requireUser(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session.user) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return session;
}

export function isDemoRequested(reqHeaders: { get(name: string): string | null }) {
  const cookieHeader = reqHeaders.get("cookie") || "";
  return cookieHeader.includes(`${DEMO_COOKIE}=`);
}
