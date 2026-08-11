import { prisma } from "@/lib/prisma";

export interface SiteRoute {
  path: string;
  title: string;
  group: "site" | "dashboard" | "admin";
  editPath?: string;
}

const SITE_ROUTES: SiteRoute[] = [
  { path: "/", title: "home", group: "site", editPath: "/admin/home" },
  { path: "/library", title: "library", group: "site" },
  { path: "/marketplace", title: "marketplace", group: "site" },
  { path: "/blog", title: "blog", group: "site" },
  { path: "/pricing", title: "pricing", group: "site" },
  { path: "/sign-in", title: "signIn", group: "site" },
  { path: "/sign-up", title: "signUp", group: "site" },
  { path: "/editor", title: "editor", group: "dashboard" },
  { path: "/dashboard", title: "dashboard", group: "dashboard" },
  { path: "/dashboard/prompts", title: "myPrompts", group: "dashboard" },
  { path: "/dashboard/collections", title: "collections", group: "dashboard" },
  { path: "/dashboard/favorites", title: "favorites", group: "dashboard" },
  { path: "/dashboard/generator", title: "generator", group: "dashboard" },
  { path: "/dashboard/analytics", title: "analytics", group: "dashboard" },
  { path: "/dashboard/subscription", title: "subscription", group: "dashboard" },
  { path: "/dashboard/settings", title: "settings", group: "dashboard" },
  { path: "/admin", title: "admin", group: "admin" },
  { path: "/admin/pages", title: "adminPages", group: "admin" },
  { path: "/admin/blog", title: "adminBlog", group: "admin" },
  { path: "/admin/themes", title: "themes", group: "admin" },
  { path: "/admin/plans", title: "plans", group: "admin" },
  { path: "/admin/settings", title: "adminSettings", group: "admin" },
  { path: "/admin/system", title: "adminSystem", group: "admin" },
];

export interface SitePageEntry {
  id: string | null;
  path: string;
  title: string;
  kind: "route" | "cms";
  group: "site" | "dashboard" | "admin" | "cms";
  status?: string;
  isPublic?: boolean;
  editPath?: string;
}

/** Merges the built-in route catalog with the CMS pages from the database. */
export async function listAllSitePages(): Promise<SitePageEntry[]> {
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: "desc" } });

  const entries: SitePageEntry[] = SITE_ROUTES.map((r) => ({
    id: null,
    path: r.path,
    title: r.title,
    kind: "route",
    group: r.group,
    editPath: r.editPath,
  }));

  for (const p of pages) {
    entries.push({
      id: p.id,
      path: `/pages/${p.slug}`,
      title: p.title,
      kind: "cms",
      group: "cms",
      status: p.status,
      isPublic: p.isPublic,
      editPath: `/admin/pages?id=${p.id}`,
    });
  }

  return entries;
}
