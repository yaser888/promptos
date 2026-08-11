import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";
import { DEFAULT_TOKENS, TOKEN_PREFIXES, buildThemeCss } from "./tokens";

export { DEFAULT_TOKENS, TOKEN_PREFIXES };

interface PresetDef {
  slug: string;
  name: string;
  description: string;
  tokens: Partial<Record<string, string>>;
}

const PRESETS: PresetDef[] = [
  {
    slug: "emerald",
    name: "Emerald (Default)",
    description: "The PromptOS default look — deep charcoal with emerald accents.",
    tokens: {},
  },
  {
    slug: "midnight",
    name: "Midnight Blue",
    description: "Dark navy surfaces with a calm blue accent.",
    tokens: {
      "--color-accent": "#60a5fa",
      "--color-accent-hover": "#93c5fd",
      "--color-accent-foreground": "#000000",
      "--color-surface": "#070b16",
      "--color-surface-secondary": "#0e1526",
      "--color-surface-tertiary": "#1a2438",
      "--color-border": "#22304a",
      "--color-border-light": "#33507a",
      "--color-text-primary": "#e2e8f0",
      "--color-text-secondary": "#94a3b8",
      "--color-text-muted": "#64748b",
    },
  },
  {
    slug: "sunset",
    name: "Sunset Amber",
    description: "Warm amber glow over dark ember surfaces.",
    tokens: {
      "--color-accent": "#f59e0b",
      "--color-accent-hover": "#fbbf24",
      "--color-accent-foreground": "#1a1206",
      "--color-surface": "#150f0a",
      "--color-surface-secondary": "#211810",
      "--color-surface-tertiary": "#33261a",
      "--color-border": "#3a2c1f",
      "--color-border-light": "#5a4530",
      "--color-text-primary": "#f1e9e0",
      "--color-text-secondary": "#c9b8a5",
      "--color-text-muted": "#8f7b66",
    },
  },
  {
    slug: "ocean",
    name: "Ocean Cyan",
    description: "Deep teal surfaces with a bright cyan accent.",
    tokens: {
      "--color-accent": "#22d3ee",
      "--color-accent-hover": "#67e8f9",
      "--color-accent-foreground": "#04202b",
      "--color-surface": "#04161d",
      "--color-surface-secondary": "#0a2230",
      "--color-surface-tertiary": "#0f2f3f",
      "--color-border": "#164451",
      "--color-border-light": "#1f5f70",
      "--color-text-primary": "#dbe7ea",
      "--color-text-secondary": "#8fb9c4",
      "--color-text-muted": "#5d828c",
    },
  },
  {
    slug: "violet",
    name: "Nocturne Violet",
    description: "Rich violet surfaces with a glowing fuchsia accent.",
    tokens: {
      "--color-accent": "#a78bfa",
      "--color-accent-hover": "#c4b5fd",
      "--color-accent-foreground": "#0f0a1a",
      "--color-surface": "#100b1a",
      "--color-surface-secondary": "#1a1328",
      "--color-surface-tertiary": "#2a1e42",
      "--color-border": "#2f2148",
      "--color-border-light": "#4a3870",
      "--color-text-primary": "#e8e4f0",
      "--color-text-secondary": "#b7aed0",
      "--color-text-muted": "#7f7598",
    },
  },
];

function safeColor(v: string): boolean {
  return (
    /^#[0-9a-fA-F]{3,8}$/.test(v) ||
    /^rgb\(.*\)$/i.test(v) ||
    /^rgba\(.*\)$/i.test(v) ||
    /^hsl\(.*\)$/i.test(v) ||
    /^oklch\(.*\)$/i.test(v)
  );
}

function safeLength(v: string): boolean {
  return /^\d+(\.\d+)?(px|rem|em|%)$/.test(v);
}

/** Validates a token map against the allow-list (color/radius/font prefixes only). */
export function validateThemes(tokens: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(tokens)) {
    if (!/^--[a-z0-9][a-z0-9-]*$/.test(key)) {
      errors.push(`Invalid token key: "${key}"`);
      continue;
    }
    if (!TOKEN_PREFIXES.some((p) => key.startsWith(p))) {
      errors.push(`Token "${key}" is not allow-listed (only --color-, --radius-, --font- prefixes)`);
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`Token "${key}" needs a value`);
      continue;
    }
    const v = value.trim();
    if (key.startsWith("--color-")) {
      if (!safeColor(v)) errors.push(`Token "${key}" is not a valid color: "${v}"`);
    } else if (!safeLength(v)) {
      errors.push(`Token "${key}" is not a valid length: "${v}"`);
    }
  }
  return errors;
}

/** Merges theme tokens over the full default set and returns the CSS bridge. */
export function themeToCSS(tokens: Record<string, string>): string {
  return buildThemeCss(tokens);
}

type ThemeRowRaw = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: unknown;
  previewData: unknown;
  isPreset: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface ThemeRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: Record<string, string>;
  isActive: boolean;
  isPreset: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toRow(t: ThemeRowRaw): ThemeRow {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    tokens: (t.tokens ?? {}) as Record<string, string>,
    isActive: t.isActive,
    isPreset: t.isPreset,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function ensureThemes(): Promise<void> {
  const existing = await prisma.theme.findMany({ select: { slug: true } });
  const slugs = new Set(existing.map((t) => t.slug));

  for (const preset of PRESETS) {
    if (slugs.has(preset.slug)) continue;
    await prisma.theme.create({
      data: {
        slug: preset.slug,
        name: preset.name,
        description: preset.description,
        tokens: preset.tokens as any,
        layout: {},
        isPreset: true,
        isActive: false,
      },
    });
  }

  const activeCount = await prisma.theme.count({ where: { isActive: true } });
  if (activeCount === 0) {
    const fallback = await prisma.theme.findUnique({ where: { slug: "emerald" } });
    if (fallback) {
      await prisma.theme.update({ where: { id: fallback.id }, data: { isActive: true } });
      await logInfo("themes", "Active theme fallback: emerald");
    }
  }
}

export async function listThemes(): Promise<ThemeRow[]> {
  const themes = await prisma.theme.findMany({
    orderBy: [{ isActive: "desc" }, { isPreset: "desc" }, { createdAt: "asc" }],
  });
  return themes.map((t) => toRow(t as ThemeRowRaw));
}

export async function getActiveTheme(): Promise<ThemeRow | null> {
  const t = await prisma.theme.findFirst({ where: { isActive: true } });
  return t ? toRow(t as ThemeRowRaw) : null;
}

export type ThemeResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function setActiveTheme(id: string): Promise<ThemeResult<{ id: string }>> {
  const target = await prisma.theme.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "Theme not found" };
  await prisma.$transaction([
    prisma.theme.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.theme.update({ where: { id }, data: { isActive: true } }),
  ]);
  await logInfo("themes", `Active theme set: ${target.slug}`);
  return { ok: true, data: { id } };
}

export async function createTheme(input: {
  name: string;
  slug?: string;
  description?: string;
  tokens?: Record<string, string>;
  baseSlug?: string;
}): Promise<ThemeResult<ThemeRow>> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Name is required" };
  let slug = input.slug?.trim();
  if (!slug) {
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return { ok: false, error: "Slug may only contain lowercase letters, numbers and hyphens" };
  }
  const slugTaken = await prisma.theme.findUnique({ where: { slug } });
  if (slugTaken) {
    const base = slug;
    let n = 2;
    let candidate = `${base}-${n}`;
    while (await prisma.theme.findUnique({ where: { slug: candidate } })) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    slug = candidate;
  }

  let tokens: Record<string, string> = {};
  if (input.baseSlug) {
    const base = await prisma.theme.findUnique({ where: { slug: input.baseSlug } });
    if (!base) return { ok: false, error: `Base theme "${input.baseSlug}" not found` };
    tokens = { ...((base.tokens ?? {}) as Record<string, string>) };
  }
  if (input.tokens) tokens = { ...tokens, ...input.tokens };
  tokens = pickAllowListed(tokens);

  const errs = validateThemes(tokens);
  if (errs.length > 0) return { ok: false, error: errs.join("; ") };

  const t = await prisma.theme.create({
    data: {
      slug,
      name,
      description: input.description?.trim() || null,
      tokens: tokens as any,
      layout: {},
      isPreset: false,
      isActive: false,
    },
  });
  await logInfo("themes", `Theme created: ${slug}`);
  return { ok: true, data: toRow(t as ThemeRowRaw) };
}

export async function updateTheme(
  id: string,
  input: { name?: string; description?: string; tokens?: Record<string, string> }
): Promise<ThemeResult<ThemeRow>> {
  const existing = await prisma.theme.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Theme not found" };

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, error: "Name is required" };
    data.name = input.name.trim();
  }
  if (input.description !== undefined) data.description = input.description.trim() || null;
  if (input.tokens !== undefined) {
    const cleaned = pickAllowListed(input.tokens);
    const errs = validateThemes(cleaned);
    if (errs.length > 0) return { ok: false, error: errs.join("; ") };
    data.tokens = cleaned as any;
  }

  const t = await prisma.theme.update({ where: { id }, data });
  await logInfo("themes", `Theme updated: ${existing.slug}`);
  return { ok: true, data: toRow(t as ThemeRowRaw) };
}

export async function deleteTheme(id: string): Promise<ThemeResult<{ deleted: boolean }>> {
  const existing = await prisma.theme.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Theme not found" };
  if (existing.isPreset) return { ok: false, error: "Preset themes cannot be deleted" };
  if (existing.isActive) return { ok: false, error: "Apply a different theme before deleting this one" };
  await prisma.theme.delete({ where: { id } });
  await logInfo("themes", `Theme deleted: ${existing.slug}`);
  return { ok: true, data: { deleted: true } };
}

function pickAllowListed(tokens: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokens).filter(([k]) => TOKEN_PREFIXES.some((prefix) => k.startsWith(prefix)))
  );
}

export { PRESETS };