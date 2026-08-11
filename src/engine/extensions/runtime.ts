import { prisma } from "@/lib/prisma";
import { logWarn } from "@/lib/logger";
import {
  getCatalogEntry,
  type ExtensionHooksContext,
  type HomeSectionData,
} from "./catalog";

export interface RuntimeExtension {
  id: string;
  slug: string;
  name: string;
  version: string;
  config: Record<string, unknown>;
  state: string;
}

async function getActiveExtensions(): Promise<RuntimeExtension[]> {
  const rows = await prisma.extension.findMany({
    where: { state: "ACTIVE" },
    select: { id: true, slug: true, name: true, version: true, config: true, state: true },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    version: row.version,
    config: (row.config ?? {}) as Record<string, unknown>,
    state: row.state,
  }));
}

function ctxFor(ext: RuntimeExtension): ExtensionHooksContext {
  return {
    extensionId: ext.id,
    slug: ext.slug,
    name: ext.name,
    version: ext.version,
    config: ext.config,
  };
}

export async function runHeadHooks(): Promise<string[]> {
  const extensions = await getActiveExtensions();
  const snippets: string[] = [];
  for (const ext of extensions) {
    const entry = getCatalogEntry(ext.slug);
    if (!entry?.hooks?.head) continue;
    try {
      const out = await entry.hooks.head(ctxFor(ext));
      if (out?.trim()) snippets.push(out);
    } catch (error) {
      logWarn("extensions", `head hook failed for ${ext.slug}`, { error: String(error) });
    }
  }
  return snippets;
}

export async function runBodyHooks(): Promise<string[]> {
  const extensions = await getActiveExtensions();
  const snippets: string[] = [];
  for (const ext of extensions) {
    const entry = getCatalogEntry(ext.slug);
    if (!entry?.hooks?.body) continue;
    try {
      const out = await entry.hooks.body(ctxFor(ext));
      if (out?.trim()) snippets.push(out);
    } catch (error) {
      logWarn("extensions", `body hook failed for ${ext.slug}`, { error: String(error) });
    }
  }
  return snippets;
}

const HOME_SECTION_ORDER: Record<string, number> = {
  "top-prompts": 20,
  newsletter: 30,
};

export async function runHomeSections(): Promise<HomeSectionData[]> {
  const extensions = await getActiveExtensions();
  const sections: HomeSectionData[] = [];
  for (const ext of extensions) {
    const entry = getCatalogEntry(ext.slug);
    if (!entry?.hooks?.homeSection) continue;
    try {
      const data = await entry.hooks.homeSection(ctxFor(ext));
      if (data) sections.push(data);
    } catch (error) {
      logWarn("extensions", `homeSection hook failed for ${ext.slug}`, { error: String(error) });
    }
  }
  return sections.sort((a, b) => {
    const pa = HOME_SECTION_ORDER[a.type] ?? 1000;
    const pb = HOME_SECTION_ORDER[b.type] ?? 1000;
    if (pa !== pb) return pa - pb;
    return a.extensionSlug.localeCompare(b.extensionSlug);
  });
}

export async function runDailyTasks(): Promise<{ slug: string; ok: boolean; error?: string }[]> {
  const extensions = await getActiveExtensions();
  const results: { slug: string; ok: boolean; error?: string }[] = [];
  for (const ext of extensions) {
    const entry = getCatalogEntry(ext.slug);
    if (!entry?.hooks?.daily) {
      results.push({ slug: ext.slug, ok: true, error: undefined });
      continue;
    }
    try {
      await entry.hooks.daily(ctxFor(ext));
      results.push({ slug: ext.slug, ok: true });
    } catch (error) {
      logWarn("extensions", `daily task failed for ${ext.slug}`, { error: String(error) });
      results.push({ slug: ext.slug, ok: false, error: String(error) });
    }
  }
  return results;
}

export async function emitExtensionEvent(
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const extensions = await getActiveExtensions();
  await Promise.allSettled(
    extensions.map(async (ext) => {
      const entry = getCatalogEntry(ext.slug);
      if (!entry?.hooks?.onEvent) return;
      try {
        await entry.hooks.onEvent(event, payload, ctxFor(ext));
      } catch (error) {
        logWarn("extensions", `onEvent(${event}) failed for ${ext.slug}`, {
          error: String(error),
        });
      }
    })
  );
}
