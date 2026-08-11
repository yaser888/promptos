import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";
import { Prisma } from "@prisma/client";

export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "image",
  "button",
  "list",
  "quote",
  "code",
  "divider",
  "html",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface PageBlock {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
}

export interface PageSeo {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}

export interface PagePermissions {
  roles: string[];
}

export interface PageResult {
  ok: boolean;
  error?: string;
  data?: {
    id: string;
    slug: string;
    title: string;
    content: PageBlock[];
    seo?: PageSeo | null;
    isPublic: boolean;
    requiresAuth: boolean;
    permissions?: PagePermissions | null;
    status: string;
    version: number;
    clonedFromId?: string | null;
    autosaveData?: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
}

const MAX_BLOCKS = 200;
const MAX_BLOCK_TEXT = 200_000;

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug || `page-${Date.now().toString(36)}`;
}

export function validateSlug(slug: string): string | null {
  if (slug.length < 2 || slug.length > 100) return "Slug must be 2-100 characters";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return "Slug must contain only lowercase letters, digits and dashes";
  return null;
}

export function validateBlocks(blocks: unknown): string | null {
  if (!Array.isArray(blocks)) return "Content must be an array of blocks";
  if (blocks.length > MAX_BLOCKS) return `A page can have at most ${MAX_BLOCKS} blocks`;
  for (const block of blocks) {
    if (!block || typeof block !== "object") return "Each block must be an object";
    const b = block as { type?: unknown; props?: unknown; id?: unknown };
    if (typeof b.id !== "string") return "Each block needs an id";
    if (typeof b.type !== "string" || !BLOCK_TYPES.includes(b.type as BlockType)) {
      return `Unknown block type: ${String(b.type)}`;
    }
    if (b.props === undefined || b.props === null || typeof b.props !== "object") {
      return "Each block needs a props object";
    }
    const props = b.props as Record<string, unknown>;
    if (b.type === "heading" && typeof props.text !== "string") return "Heading blocks need text";
    if (b.type === "paragraph" && typeof props.text !== "string") return "Paragraph blocks need text";
    if (b.type === "image" && typeof props.url !== "string") return "Image blocks need a url";
    if (b.type === "button" && typeof props.text !== "string") return "Button blocks need text";
    if (b.type === "quote" && typeof props.text !== "string") return "Quote blocks need text";
    if (b.type === "code" && typeof props.code !== "string") return "Code blocks need code";
    if (b.type === "list" && !Array.isArray(props.items)) return "List blocks need items array";
    if (b.type === "html" && typeof props.html !== "string") return "HTML blocks need html";
    const serialized = JSON.stringify(b);
    if (serialized.length > MAX_BLOCK_TEXT) return "Block content is too large";
  }
  return null;
}

export function publicPageSelect() {
  return {
    id: true,
    slug: true,
    title: true,
    content: true,
    seo: true,
    isPublic: true,
    requiresAuth: true,
    status: true,
    version: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

export async function listPages(): Promise<PageResult["data"][]> {
  const pages = await prisma.page.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      isPublic: true,
      requiresAuth: true,
      version: true,
      clonedFromId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return pages as unknown as PageResult["data"][];
}

export async function getPageBySlug(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    select: publicPageSelect(),
  });
  return page;
}

export async function createPage(input: {
  title: string;
  slug?: string;
  content?: unknown;
  seo?: PageSeo;
  isPublic?: boolean;
  requiresAuth?: boolean;
  permissions?: PagePermissions;
  status?: string;
}): Promise<PageResult> {
  const title = (input.title || "").trim();
  if (!title) return { ok: false, error: "Title is required" };

  const slug = input.slug ? String(input.slug).trim() : slugify(title);
  if (input.slug) {
    const slugError = validateSlug(slug);
    if (slugError) return { ok: false, error: slugError };
  }

  const blocks = input.content ?? [];
  const contentError = validateBlocks(blocks);
  if (contentError) return { ok: false, error: contentError };

  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) return { ok: false, error: `A page with slug "${slug}" already exists` };

  const page = await prisma.page.create({
    data: {
      title,
      slug,
      content: blocks as Prisma.InputJsonValue,
      seo: input.seo as Prisma.InputJsonValue | undefined,
      isPublic: input.isPublic ?? true,
      requiresAuth: input.requiresAuth ?? false,
      permissions: input.permissions as Prisma.InputJsonValue | undefined,
      status: input.status === "published" ? "published" : "draft",
      version: 1,
    },
  });
  logInfo("pages", `Page created`, { slug, title });
  return { ok: true, data: page as unknown as PageResult["data"] };
}

export async function updatePage(
  id: string,
  input: {
    title?: string;
    slug?: string;
    content?: unknown;
    seo?: PageSeo | null;
    isPublic?: boolean;
    requiresAuth?: boolean;
    permissions?: PagePermissions | null;
    status?: string;
  }
): Promise<PageResult> {
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found" };

  if (input.slug !== undefined) {
    const slug = String(input.slug).trim();
    const slugError = validateSlug(slug);
    if (slugError) return { ok: false, error: slugError };
    if (slug !== existing.slug) {
      const clash = await prisma.page.findUnique({ where: { slug } });
      if (clash) return { ok: false, error: `A page with slug "${slug}" already exists` };
    }
  }

  const blocks = input.content ?? existing.content ?? [];
  const contentError = validateBlocks(blocks);
  if (contentError) return { ok: false, error: contentError };

  const page = await prisma.page.update({
    where: { id },
    data: {
      title: input.title?.trim() || existing.title,
      slug: input.slug !== undefined ? String(input.slug).trim() : existing.slug,
      content: blocks as Prisma.InputJsonValue,
      ...(input.seo !== undefined
        ? { seo: input.seo === null ? Prisma.JsonNull : (input.seo as Prisma.InputJsonValue) }
        : {}),
      isPublic: input.isPublic ?? existing.isPublic,
      requiresAuth: input.requiresAuth ?? existing.requiresAuth,
      ...(input.permissions !== undefined
        ? {
            permissions:
              input.permissions === null
                ? Prisma.JsonNull
                : (input.permissions as unknown as Prisma.InputJsonValue),
          }
        : {}),
      status:
        input.status === "published" || input.status === "draft"
          ? input.status
          : existing.status,
      version: { increment: 1 },
      autosaveData: Prisma.JsonNull,
    },
  });
  logInfo("pages", `updated page`, { slug: page.slug, version: page.version });
  return { ok: true, data: page as unknown as PageResult["data"] };
}

export async function autosavePage(id: string, data: { content?: unknown; seo?: PageSeo }): Promise<PageResult> {
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found" };

  const blocks = data.content ?? existing.content;
  const contentError = validateBlocks(blocks);
  if (contentError) return { ok: false, error: contentError };

  const page = await prisma.page.update({
    where: { id },
    data: {
      autosaveData: {
        content: blocks,
        seo: data.seo ?? existing.seo,
        at: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
  return { ok: true, data: page as unknown as PageResult["data"] };
}

export async function setPageStatus(id: string, status: "published" | "draft"): Promise<PageResult> {
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found" };
  const page = await prisma.page.update({ where: { id }, data: { status } });
  return { ok: true, data: page as unknown as PageResult["data"] };
}

export async function clonePage(id: string): Promise<PageResult> {
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found" };

  let slug = `${existing.slug}-2`;
  let counter = 2;
  while (await prisma.page.findUnique({ where: { slug } })) {
    counter += 1;
    slug = `${existing.slug}-${counter}`;
  }

  const page = await prisma.page.create({
    data: {
      title: `${existing.title} (Copy)`,
      slug,
      content: existing.content as Prisma.InputJsonValue,
      seo: existing.seo as Prisma.InputJsonValue | undefined,
      isPublic: existing.isPublic,
      requiresAuth: existing.requiresAuth,
      permissions: existing.permissions as Prisma.InputJsonValue | undefined,
      status: "draft",
      version: 1,
      clonedFromId: existing.id,
    },
  });
  logInfo("pages", `Cloned page`, { from: existing.slug, to: slug });
  return { ok: true, data: page as unknown as PageResult["data"] };
}

export async function deletePage(id: string): Promise<{ ok: boolean; error?: string }> {
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found" };
  await prisma.page.delete({ where: { id } });
  logInfo("pages", `Deleted page`, { slug: existing.slug });
  return { ok: true };
}