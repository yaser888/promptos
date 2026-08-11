import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";
import type { SocialIcon } from "./socials.types";
import { SOCIAL_ICONS } from "./socials.types";

export { SOCIAL_ICONS } from "./socials.types";
export type { SocialIcon } from "./socials.types";

export interface SocialLinkInput {
  label: string;
  url: string;
  icon: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SocialLinkRow {
  id: string;
  label: string;
  url: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export const SOCIAL_DEFAULTS: SocialLinkInput[] = [
  { label: "GitHub", url: "https://github.com", icon: "github", sortOrder: 0 },
  { label: "X (Twitter)", url: "https://x.com", icon: "x", sortOrder: 1 },
  { label: "Discord", url: "https://discord.com", icon: "discord", sortOrder: 2 },
];

export function validateSocialLink(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return ["Invalid social link data"];
  const raw = input as Record<string, unknown>;
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(url)) {
    errors.push("URL must be a valid http(s) link");
  }
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label || label.length > 100) errors.push("Label is required (max 100 chars)");
  const icon = typeof raw.icon === "string" ? raw.icon.trim() : "link";
  if (!SOCIAL_ICONS.includes(icon as SocialIcon)) {
    errors.push(`Icon must be one of: ${SOCIAL_ICONS.join(", ")}`);
  }
  if (raw.sortOrder !== undefined && (typeof raw.sortOrder !== "number" || !Number.isInteger(raw.sortOrder))) {
    errors.push("sortOrder must be an integer");
  }
  if (raw.isActive !== undefined && typeof raw.isActive !== "boolean") {
    errors.push("isActive must be a boolean");
  }
  return errors;
}

export function validateSocialLinkPatch(input: Partial<SocialLinkInput>): string[] {
  const errors: string[] = [];
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label || label.length > 100) errors.push("Label is required (max 100 chars)");
  }
  if (input.url !== undefined && !/^https?:\/\/[^\s]+\.[^\s]+/.test(input.url.trim())) {
    errors.push("URL must be a valid http(s) link");
  }
  if (input.icon !== undefined) {
    const icon = input.icon.trim();
    if (!SOCIAL_ICONS.includes(icon as SocialIcon)) {
      errors.push(`Icon must be one of: ${SOCIAL_ICONS.join(", ")}`);
    }
  }
  if (input.sortOrder !== undefined && (typeof input.sortOrder !== "number" || !Number.isInteger(input.sortOrder))) {
    errors.push("sortOrder must be an integer");
  }
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    errors.push("isActive must be a boolean");
  }
  return errors;
}

export function toSocialRow(l: {
  id: string;
  label: string;
  url: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}): SocialLinkRow {
  return {
    id: l.id,
    label: l.label,
    url: l.url,
    icon: l.icon,
    sortOrder: l.sortOrder,
    isActive: l.isActive,
  };
}

export async function listSocialLinks(): Promise<SocialLinkRow[]> {
  const rows = await prisma.socialLink.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map(toSocialRow);
}

export async function ensureSocialLinks(): Promise<void> {
  const count = await prisma.socialLink.count();
  if (count > 0) return;
  await prisma.socialLink.createMany({
    data: SOCIAL_DEFAULTS.map((d) => ({
      label: d.label,
      url: d.url,
      icon: d.icon,
      sortOrder: d.sortOrder ?? 0,
      isActive: true,
    })),
  });
  logInfo("social-links", "Seeded default social links");
}

export async function createSocialLink(input: SocialLinkInput): Promise<SocialLinkRow> {
  const row = await prisma.socialLink.create({
    data: {
      label: input.label.trim(),
      url: input.url.trim(),
      icon: input.icon.trim(),
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  return toSocialRow(row);
}

export async function updateSocialLink(
  id: string,
  input: Partial<SocialLinkInput>
): Promise<SocialLinkRow | null> {
  const existing = await prisma.socialLink.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.socialLink.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.url !== undefined ? { url: input.url.trim() } : {}),
      ...(input.icon !== undefined ? { icon: input.icon.trim() } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return toSocialRow(row);
}

export async function deleteSocialLink(id: string): Promise<boolean> {
  const existing = await prisma.socialLink.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.socialLink.delete({ where: { id } });
  return true;
}
