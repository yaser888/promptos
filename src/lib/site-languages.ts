import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultLocale, localeConfig, type Locale } from "@/i18n/config";

export interface SiteLanguageRecord {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  flag: string;
  enabled: boolean;
  isDefault: boolean;
  isCustom: boolean;
}

const MAX_LANGUAGES = 16;
const CODE_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/;
const FLAG_PATTERN = /^[^\s]{1,8}$/;

export const BUILTIN_LANGUAGES: SiteLanguageRecord[] = (Object.keys(localeConfig) as Locale[]).map(
  (code) => ({
    code,
    name: localeConfig[code].name,
    nativeName: localeConfig[code].nativeName,
    dir: localeConfig[code].dir,
    flag: localeConfig[code].flag,
    enabled: true,
    isDefault: code === defaultLocale,
    isCustom: false,
  })
);

export const BUILTIN_CODES = new Set(BUILTIN_LANGUAGES.map((l) => l.code));

const DEFAULT_LANGUAGE_CODE = defaultLocale;

interface CacheEntry {
  at: number;
  registry: SiteLanguageRecord[];
}

const CACHE_TTL_MS = 30_000;

const globalCache = globalThis as unknown as { __siteLanguagesCache?: CacheEntry };

function freshCache(registry: SiteLanguageRecord[]): void {
  globalCache.__siteLanguagesCache = { at: Date.now(), registry };
}

export function invalidateLanguagesCache(): void {
  delete globalCache.__siteLanguagesCache;
}

export function sanitizeLanguageCode(code: string): string | null {
  const trimmed = code.trim().toLowerCase();
  return CODE_PATTERN.test(trimmed) ? trimmed : null;
}

function sanitizeFlag(flag: string): string {
  const trimmed = flag.trim();
  return trimmed.length > 0 && trimmed.length <= 8 ? trimmed : "";
}

export function sanitizeRegistry(input: unknown): SiteLanguageRecord[] {
  const registry: SiteLanguageRecord[] = [];
  if (!Array.isArray(input)) return BUILTIN_LANGUAGES;

  const seen = new Set<string>();

  const pushBuiltins = () => {
    for (const builtin of BUILTIN_LANGUAGES) {
      if (seen.has(builtin.code)) continue;
      seen.add(builtin.code);
      registry.push({ ...builtin });
    }
  };

  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<SiteLanguageRecord>;
    const code = sanitizeLanguageCode(typeof record.code === "string" ? record.code : "");
    if (!code || seen.has(code)) continue;
    seen.add(code);
    registry.push({
      code,
      name: typeof record.name === "string" && record.name.trim() ? record.name.trim().slice(0, 60) : code,
      nativeName:
        typeof record.nativeName === "string" && record.nativeName.trim()
          ? record.nativeName.trim().slice(0, 60)
          : code,
      dir: record.dir === "rtl" ? "rtl" : "ltr",
      flag: sanitizeFlag(typeof record.flag === "string" ? record.flag : ""),
      enabled: record.enabled !== false,
      isDefault: code === DEFAULT_LANGUAGE_CODE,
      isCustom: !BUILTIN_CODES.has(code),
    });
  }

  pushBuiltins();

  const defaultEntry = registry.find((l) => l.code === DEFAULT_LANGUAGE_CODE);
  if (defaultEntry) defaultEntry.enabled = true;
  if (!registry.some((l) => l.enabled)) {
    for (const l of registry) l.enabled = true;
  }

  return registry.slice(0, MAX_LANGUAGES);
}

export async function loadRegistryFromDb(): Promise<SiteLanguageRecord[]> {
  try {
    const setting = await prisma.setting.findFirst();
    const metadata = (setting?.metadata ?? {}) as Record<string, unknown>;
    return sanitizeRegistry(metadata.siteLanguages);
  } catch {
    return BUILTIN_LANGUAGES;
  }
}

export async function getLanguageRegistry(): Promise<SiteLanguageRecord[]> {
  const cache = globalCache.__siteLanguagesCache;
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.registry;
  }
  const registry = await loadRegistryFromDb();
  freshCache(registry);
  return registry;
}

export async function getEnabledLanguages(): Promise<SiteLanguageRecord[]> {
  return (await getLanguageRegistry()).filter((l) => l.enabled);
}

export async function getEnabledCodes(): Promise<string[]> {
  return (await getEnabledLanguages()).map((l) => l.code);
}

export async function getKnownCodes(): Promise<string[]> {
  return (await getLanguageRegistry()).map((l) => l.code);
}

export async function getLanguageDirection(code: string): Promise<"ltr" | "rtl"> {
  const registry = await getLanguageRegistry();
  return registry.find((l) => l.code === code)?.dir ?? "ltr";
}

export async function saveLanguageRegistry(input: unknown): Promise<SiteLanguageRecord[]> {
  const registry = sanitizeRegistry(input);
  let setting = await prisma.setting.findFirst();
  const currentMetadata = (setting?.metadata ?? {}) as Record<string, unknown>;
  const nextMetadata = { ...currentMetadata, siteLanguages: registry } as unknown as Prisma.InputJsonValue;
  if (setting) {
    setting = await prisma.setting.update({
      where: { id: setting.id },
      data: { metadata: nextMetadata },
    });
  } else {
    setting = await prisma.setting.create({ data: { metadata: nextMetadata } });
  }
  invalidateLanguagesCache();
  const saved = sanitizeRegistry((setting.metadata as Record<string, unknown>).siteLanguages);
  freshCache(saved);
  return saved;
}

export { MAX_LANGUAGES, FLAG_PATTERN, DEFAULT_LANGUAGE_CODE };