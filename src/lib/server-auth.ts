import { cookies } from "next/headers";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "promptos_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function sessionSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_ACCESS_KEY || "promptos-local-session-secret";
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

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString("hex");
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, rStr, pStr, salt, expectedHex] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !expectedHex) return false;
    const candidate = crypto
      .scryptSync(password, salt, 64, { N: Number(nStr), r: Number(rStr), p: Number(pStr) })
      .toString("hex");
    const a = Buffer.from(candidate, "utf8");
    const b = Buffer.from(expectedHex, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function signSessionToken(clerkId: string, expiresAt: number): string {
  const payload = Buffer.from(`${clerkId}.${expiresAt}`).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const dot = decoded.lastIndexOf(".");
    if (dot <= 0) return null;
    const clerkId = decoded.slice(0, dot);
    const exp = Number(decoded.slice(dot + 1));
    if (!clerkId || !Number.isFinite(exp) || exp < Date.now()) return null;
    return clerkId;
  } catch {
    return null;
  }
}

export async function createSession(clerkId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(clerkId, Date.now() + SESSION_TTL_SECONDS * 1000), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function registerWithPassword(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ServerSession["user"]> {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password || "";

  if (!name || name.length < 2 || name.length > 60) {
    const err: any = new Error("Name must be between 2 and 60 characters");
    err.status = 400;
    throw err;
  }
  if (!EMAIL_PATTERN.test(email)) {
    const err: any = new Error("Enter a valid email address");
    err.status = 400;
    throw err;
  }
  if (password.length < 8 || password.length > 128) {
    const err: any = new Error("Password must be at least 8 characters");
    err.status = 400;
    throw err;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err: any = new Error("An account with this email already exists");
    err.status = 409;
    throw err;
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN", passwordHash: { not: null } } });
  const user = await prisma.user.create({
    data: {
      clerkId: `local_${crypto.randomUUID()}`,
      email,
      name: name.slice(0, 60),
      passwordHash: hashPassword(password),
      role: adminCount === 0 ? "ADMIN" : "USER",
      credits: 100,
    },
  });

  return { id: user.id, clerkId: user.clerkId, name: user.name, email: user.email, role: user.role };
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ clerkId: string } | null> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return null;
  if (!verifyPassword(input.password || "", user.passwordHash)) return null;
  return { clerkId: user.clerkId };
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
    const token = store.get(SESSION_COOKIE)?.value;
    const clerkId = token ? verifySessionToken(token) : null;
    if (!clerkId) return empty;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, name: true, email: true, role: true },
    });
    if (!user) return empty;
    return { userId: user.clerkId, clerkId: user.clerkId, user };
  } catch {
    return empty;
  }
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

export function hasSessionRequested(reqHeaders: { get(name: string): string | null }) {
  const cookieHeader = reqHeaders.get("cookie") || "";
  return cookieHeader.includes(`${SESSION_COOKIE}=`);
}