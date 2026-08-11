import { prisma } from "@/lib/prisma";
import { validateManifest, type ExtensionManifest, isRegisteredNamespace } from "@/core/registry/kernel";
import { logInfo, logWarn } from "@/lib/logger";

export interface ExtensionWithLogs {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string | null;
  author: string | null;
  license: string | null;
  state: string;
  namespace: string;
  permissions: string[];
  dependencies: string[];
  installedAt: Date;
  updatedAt: Date;
  latestLog: { level: string; message: string; createdAt: Date } | null;
  logCount: number;
}

function toExtensionWithLogs(ext: any, logs: any[]): ExtensionWithLogs {
  const manifest = (ext.manifest ?? {}) as Partial<ExtensionManifest>;
  return {
    id: ext.id,
    name: ext.name,
    slug: ext.slug,
    version: ext.version,
    description: ext.description,
    author: ext.author,
    license: ext.license,
    state: ext.state,
    namespace: manifest.namespace ?? "system",
    permissions: Array.isArray(manifest.permissions) ? manifest.permissions : [],
    dependencies: Array.isArray(ext.dependencies) ? ext.dependencies : [],
    installedAt: ext.installedAt,
    updatedAt: ext.updatedAt,
    latestLog: logs[0]
      ? { level: logs[0].level, message: logs[0].message, createdAt: logs[0].createdAt }
      : null,
    logCount: logs.length,
  };
}

export async function listExtensions(): Promise<ExtensionWithLogs[]> {
  const extensions = await prisma.extension.findMany({
    where: { state: { not: "REMOVED" } },
    orderBy: { installedAt: "desc" },
  });

  const logs = await prisma.extensionLog.findMany({
    where: { extensionId: { in: extensions.map((e) => e.id) } },
    orderBy: { createdAt: "desc" },
  });

  const byExt = new Map<string, any[]>();
  for (const log of logs) {
    const arr = byExt.get(log.extensionId) ?? [];
    if (arr.length < 5) arr.push(log);
    byExt.set(log.extensionId, arr);
  }

  return extensions.map((ext) => toExtensionWithLogs(ext, byExt.get(ext.id) ?? []));
}

export async function getExtensionLogs(id: string, limit = 20) {
  return prisma.extensionLog.findMany({
    where: { extensionId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export type InstallResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function installExtension(rawManifest: unknown): Promise<InstallResult> {
  const validated = validateManifest(rawManifest);
  if (!validated.ok) {
    return { ok: false, error: validated.errors.join("; ") };
  }
  const m = validated.manifest;

  const existing = await prisma.extension.findUnique({ where: { slug: m.slug } });
  if (existing && existing.state !== "REMOVED") {
    return { ok: false, error: `Extension "${m.slug}" is already installed` };
  }

  const installed = await prisma.extension.findMany({
    where: { state: { not: "REMOVED" } },
    select: { slug: true },
  });
  const installedSlugs = new Set(installed.map((e) => e.slug));
  for (const dep of m.dependencies) {
    if (!installedSlugs.has(dep) && !isRegisteredNamespace(dep)) {
      return {
        ok: false,
        error: `Missing dependency "${dep}". Install it first or it must be a registered core namespace.`,
      };
    }
  }

  const record = existing
    ? await prisma.extension.update({
        where: { id: existing.id },
        data: {
          name: m.name,
          version: m.version,
          description: m.description ?? null,
          manifest: m as any,
          dependencies: m.dependencies,
          author: m.author ?? null,
          license: m.license ?? null,
          state: "ACTIVE",
        },
      })
    : await prisma.extension.create({
        data: {
          name: m.name,
          slug: m.slug,
          version: m.version,
          description: m.description ?? null,
          manifest: m as any,
          dependencies: m.dependencies,
          author: m.author ?? null,
          license: m.license ?? null,
          state: "ACTIVE",
        },
      });

  await prisma.extensionLog.create({
    data: {
      extensionId: record.id,
      level: "info",
      message: `Installed v${m.version}`,
      metadata: { slug: m.slug } as any,
    },
  });
  await logInfo("extensions", `Extension installed: ${m.slug} v${m.version}`);

  return { ok: true, id: record.id };
}

export type SetStateResult = { ok: true; state: string } | { ok: false; error: string };

export async function updateExtensionConfig(
  id: string,
  config: Record<string, unknown>
): Promise<{ ok: true; config: Record<string, unknown> } | { ok: false; error: string }> {
  const ext = await prisma.extension.findUnique({ where: { id } });
  if (!ext || ext.state === "REMOVED") {
    return { ok: false, error: "Extension not found" };
  }
  const updated = await prisma.extension.update({
    where: { id },
    data: { config: config as any },
  });
  await prisma.extensionLog.create({
    data: {
      extensionId: id,
      level: "info",
      message: "Configuration updated",
    },
  });
  return { ok: true, config: (updated.config ?? {}) as Record<string, unknown> };
}

export async function setExtensionState(id: string, state: "ACTIVE" | "DISABLED"): Promise<SetStateResult> {
  const ext = await prisma.extension.findUnique({ where: { id } });
  if (!ext || ext.state === "REMOVED") {
    return { ok: false, error: "Extension not found" };
  }
  const updated = await prisma.extension.update({
    where: { id },
    data: { state },
  });
  await prisma.extensionLog.create({
    data: {
      extensionId: id,
      level: "info",
      message: state === "ACTIVE" ? "Enabled" : "Disabled",
    },
  });
  await logInfo("extensions", `Extension ${state === "ACTIVE" ? "enabled" : "disabled"}: ${ext.slug}`);
  return { ok: true, state: updated.state };
}

export async function removeExtension(id: string): Promise<{ ok: boolean; error?: string }> {
  const ext = await prisma.extension.findUnique({ where: { id } });
  if (!ext || ext.state === "REMOVED") {
    return { ok: false, error: "Extension not found" };
  }
  await prisma.extension.update({ where: { id }, data: { state: "REMOVED" } });
  await prisma.extensionLog.create({
    data: { extensionId: id, level: "warn", message: "Removed (disabled permanently)" },
  });
  await logWarn("extensions", `Extension removed: ${ext.slug}`);
  return { ok: true };
}

export { validateManifest };