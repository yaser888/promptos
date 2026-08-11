import { prisma } from "@/lib/prisma";

let cached: Record<string, unknown> | null = null;
let cachedAt = 0;
const TTL = 60_000;

export async function getSettings(useCache = true): Promise<Record<string, unknown>> {
  if (useCache && cached && Date.now() - cachedAt < TTL) {
    return cached;
  }
  const row = await prisma.setting.findFirst();
  cached = (row ?? {}) as Record<string, unknown>;
  cachedAt = Date.now();
  return cached;
}

export async function isEnabled(name: string, fallback = true): Promise<boolean> {
  const s = await getSettings();
  const v = s[name];
  return v === undefined || v === null ? fallback : Boolean(v);
}

export function invalidateSettingsCache(): void {
  cached = null;
  cachedAt = 0;
}