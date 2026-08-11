/**
 * Kernel — سجل النواة.
 *
 * الامتدادات لا تصل للنواة مباشرة إطلاقًا؛ كل استدعاء يمر عبر namespace
 * مسجّل هنا مع تصريح (permission) مطلوب. هذا السجل هو الجدار الوحيد بين
 * PromptOS Core والكود الخارجي (بديل أصلي عن Plugins في WordPress).
 */

export type Permission =
  | "system.read"
  | "system.write"
  | "settings.read"
  | "settings.write"
  | "users.read"
  | "users.write"
  | "prompts.read"
  | "prompts.write"
  | "imports.read"
  | "imports.write"
  | "marketplace.read"
  | "marketplace.write"
  | "pages.read"
  | "pages.write"
  | "themes.write"
  | "payments.read"
  | "analytics.write";

export interface KernelNamespace {
  name: string;
  permission: Permission;
  description: string;
}

export const KERNEL_NAMESPACES: KernelNamespace[] = [
  { name: "system", permission: "system.read", description: "Read system health, logs and backups" },
  { name: "settings", permission: "settings.read", description: "Read site settings" },
  { name: "users", permission: "users.read", description: "Read user profiles" },
  { name: "prompts", permission: "prompts.read", description: "Read prompt library entries" },
  { name: "imports", permission: "imports.read", description: "Read and inject prompt import sources" },
  { name: "marketplace", permission: "marketplace.read", description: "Read marketplace listings" },
  { name: "pages", permission: "pages.read", description: "Read custom pages" },
];

export function isRegisteredNamespace(name: string): boolean {
  return KERNEL_NAMESPACES.some((n) => n.name === name);
}

const ALL_PERMISSIONS: ReadonlySet<string> = new Set<string>([
  "system.read",
  "system.write",
  "settings.read",
  "settings.write",
  "users.read",
  "users.write",
  "prompts.read",
  "prompts.write",
  "imports.read",
  "imports.write",
  "marketplace.read",
  "marketplace.write",
  "pages.read",
  "pages.write",
  "themes.write",
  "payments.read",
  "analytics.write",
]);

export function permissionForNamespace(name: string): Permission | null {
  return KERNEL_NAMESPACES.find((n) => n.name === name)?.permission ?? null;
}

export interface ExtensionManifest {
  name: string;
  slug: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  namespace: string;
  permissions: Permission[];
  dependencies: string[];
  entry?: string;
}

export function validateManifest(manifest: unknown): { ok: true; manifest: ExtensionManifest } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== "object") {
    return { ok: false, errors: ["manifest must be an object"] };
  }
  const m = manifest as Partial<ExtensionManifest>;

  if (typeof m.name !== "string" || !m.name.trim()) errors.push("name is required");
  if (typeof m.slug !== "string" || !/^[a-z0-9][a-z0-9-_]{1,62}$/i.test(m.slug)) {
    errors.push("slug must match /^[a-z0-9][a-z0-9-_]{1,62}$/");
  }
  if (typeof m.version !== "string" || !/^\d+\.\d+\.\d+$/.test(m.version)) {
    errors.push("version must be semver (x.y.z)");
  }
  if (m.namespace && !isRegisteredNamespace(m.namespace)) {
    errors.push(`namespace "${m.namespace}" is not registered in the kernel`);
  }
  if (m.permissions && !Array.isArray(m.permissions)) {
    errors.push("permissions must be an array");
  }
  if (m.permissions && m.permissions.some((p) => !ALL_PERMISSIONS.has(p))) {
    errors.push("unknown permission declared");
  }
  if (m.dependencies && !Array.isArray(m.dependencies)) {
    errors.push("dependencies must be an array of slugs");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, manifest: m as ExtensionManifest };
}