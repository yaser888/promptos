import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const TOOL_KEY_NAME_PATTERN = /^[a-zA-Z0-9_-]{2,40}$/;

export const TOOL_PROVIDERS: { name: string; hint: string }[] = [
  { name: "OPENAI_API_KEY", hint: "sk-..." },
  { name: "ANTHROPIC_API_KEY", hint: "sk-ant-..." },
  { name: "GEMINI_API_KEY", hint: "AIza..." },
  { name: "MISTRAL_API_KEY", hint: "..." },
  { name: "OPENROUTER_API_KEY", hint: "sk-or-..." },
  { name: "GROQ_API_KEY", hint: "gsk_..." },
  { name: "DEEPSEEK_API_KEY", hint: "sk-..." },
  { name: "GITHUB_TOKEN", hint: "ghp_..." },
];

export type ToolKeyRecord = {
  name: string;
  hasValue: boolean;
  createdAt: string;
  updatedAt: string;
};

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_ACCESS_KEY || "promptos-local-session-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptValue(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decryptValue(payload: string): string | null {
  try {
    const [ivHex, tagHex, dataHex] = payload.split(":");
    if (!ivHex || !tagHex || !dataHex) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function parseToolKeys(metadata: Record<string, unknown>): { name: string; value: string; createdAt: string; updatedAt: string }[] {
  const raw = metadata.toolKeys;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is { name: string; value: string; createdAt: string; updatedAt: string } =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as any).name === "string" &&
      typeof (entry as any).value === "string" &&
      typeof (entry as any).createdAt === "string" &&
      typeof (entry as any).updatedAt === "string"
  );
}

export async function listToolKeys(): Promise<ToolKeyRecord[]> {
  const setting = await prisma.setting.findFirst();
  const metadata = (setting?.metadata ?? {}) as Record<string, unknown>;
  return parseToolKeys(metadata)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      name: entry.name,
      hasValue: entry.value.length > 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
}

export async function getToolKeyValue(name: string): Promise<string | null> {
  const setting = await prisma.setting.findFirst();
  const metadata = (setting?.metadata ?? {}) as Record<string, unknown>;
  const entry = parseToolKeys(metadata).find((e) => e.name === name);
  if (!entry || !entry.value) return null;
  return decryptValue(entry.value);
}

export async function saveToolKey(name: string, value: string): Promise<void> {
  const trimmedName = name.trim();
  if (!TOOL_KEY_NAME_PATTERN.test(trimmedName)) {
    const err: any = new Error("Key name must be 2-40 characters (letters, numbers, _ or -)");
    err.status = 400;
    throw err;
  }
  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.length > 500) {
    const err: any = new Error("Key value is required and must be under 500 characters");
    err.status = 400;
    throw err;
  }

  const setting = await prisma.setting.findFirst();
  const metadata = (setting?.metadata ?? {}) as Record<string, unknown>;
  const entries = parseToolKeys(metadata);
  const now = new Date().toISOString();
  const existing = entries.find((e) => e.name === trimmedName);
  if (existing) {
    existing.value = encryptValue(trimmedValue);
    existing.updatedAt = now;
  } else {
    entries.push({ name: trimmedName, value: encryptValue(trimmedValue), createdAt: now, updatedAt: now });
  }
  if (entries.length > 50) {
    const err: any = new Error("Maximum of 50 tool keys allowed");
    err.status = 400;
    throw err;
  }
  const nextMetadata = { ...metadata, toolKeys: entries } as unknown as Prisma.InputJsonValue;
  if (setting) {
    await prisma.setting.update({ where: { id: setting.id }, data: { metadata: nextMetadata } });
  } else {
    await prisma.setting.create({ data: { metadata: nextMetadata } });
  }
}

export async function deleteToolKey(name: string): Promise<boolean> {
  const setting = await prisma.setting.findFirst();
  const metadata = (setting?.metadata ?? {}) as Record<string, unknown>;
  const entries = parseToolKeys(metadata).filter((e) => e.name !== name);
  if (entries.length === parseToolKeys(metadata).length) return false;
  const nextMetadata = { ...metadata, toolKeys: entries } as unknown as Prisma.InputJsonValue;
  if (setting) {
    await prisma.setting.update({ where: { id: setting.id }, data: { metadata: nextMetadata } });
  } else {
    await prisma.setting.create({ data: { metadata: nextMetadata } });
  }
  return true;
}