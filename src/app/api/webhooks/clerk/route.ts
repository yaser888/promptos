import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || "";

const ALLOWED_EVENTS = new Set(["user.created", "user.updated", "user.deleted"]);
const ALLOWED_ROLES = new Set(["ADMIN", "USER", "MODERATOR"]);

function decodeSecretSecret(secret: string): Buffer {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(raw, "base64");
}

function signPayload(secret: Buffer, id: string, timestamp: string, payload: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
}

function timestampFresh(timestamp: string, windowSec = 300): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(Date.now() / 1000 - ts) <= windowSec;
}

function extractProfile(data: any): {
  clerkId: string;
  name: string;
  email: string;
  role: string | undefined;
  avatar: string | null;
} {
  const address =
    Array.isArray(data?.email_addresses) && data.email_addresses.length > 0
      ? data.email_addresses[0].email_address
      : data?.primary_email_address?.email_address || "";
  const email = typeof address === "string" ? address.trim() : "";
  const name =
    (typeof data?.first_name === "string" ? data.first_name.trim() : "") +
    (typeof data?.last_name === "string" ? ` ${data.last_name.trim()}` : "");
  const fullName = name.trim() || (typeof data?.username === "string" ? data.username.trim() : "") || email || "User";
  const metaRole = data?.public_metadata?.role;
  const role = ALLOWED_ROLES.has(metaRole) ? metaRole : undefined;
  const avatar = typeof data?.image_url === "string" ? data.image_url : null;
  return {
    clerkId: typeof data?.id === "string" ? data.id : "",
    name: fullName.slice(0, 60),
    email: email.slice(0, 190),
    role,
    avatar,
  };
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET is not configured" }, { status: 400 });
  }

  const payload = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
  }
  if (!timestampFresh(svixTimestamp)) {
    return NextResponse.json({ error: "Timestamp not fresh" }, { status: 401 });
  }

  const secret = decodeSecretSecret(WEBHOOK_SECRET);
  const expected = signPayload(secret, svixId, svixTimestamp, payload);
  const provided = svixSignature
    .split(" ")
    .map((part) => {
      const [version, sig] = part.trim().split(",");
      return version === "v1" ? sig : null;
    })
    .filter((sig): sig is string => !!sig);

  if (provided.length === 0 || !provided.some((sig) => crypto.timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(expected, "base64")))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = typeof event?.type === "string" ? event.type : "";
  if (!ALLOWED_EVENTS.has(type)) {
    return NextResponse.json({ received: true });
  }

  const data = event?.data ?? {};
  if (type === "user.deleted") {
    const clerkId = typeof data?.id === "string" ? data.id : "";
    if (!clerkId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    try {
      await prisma.user.delete({ where: { clerkId } });
    } catch {
      // Keep the record when related data prevents deletion.
    }
    return NextResponse.json({ received: true });
  }

  const profile = extractProfile(data);
  if (!profile.clerkId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  await prisma.user.upsert({
    where: { clerkId: profile.clerkId },
    create: {
      clerkId: profile.clerkId,
      email: profile.email || `${profile.clerkId}@clerk`,
      name: profile.name,
      avatar: profile.avatar,
      role: (profile.role as any) ?? "USER",
      credits: 100,
    },
    update: {
      name: profile.name || undefined,
      email: profile.email || undefined,
      avatar: profile.avatar ?? undefined,
      ...(profile.role ? { role: profile.role as any } : {}),
    },
  });

  return NextResponse.json({ received: true });
}