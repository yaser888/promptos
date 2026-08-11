"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BlocksRenderer from "@/components/pages/blocks-renderer";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
  Copy,
  ArrowUp,
  ArrowDown,
  Pencil,
  Save,
  FileText,
  Rocket,
  Lock,
  ExternalLink,
  Check,
} from "lucide-react";
import type { BlockType, PageBlock, PageSeo } from "@/engine/pages/pages.service";
import type { SitePageEntry } from "@/engine/site-pages/site-pages.service";

interface PageItem {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  isPublic: boolean;
  requiresAuth: boolean;
  version: number;
  clonedFromId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EditorState {
  id: string | null;
  title: string;
  slug: string;
  isPublic: boolean;
  requiresAuth: boolean;
  seo: PageSeo;
  blocks: PageBlock[];
}

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch("/api/admin/system/csrf", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    csrfToken = data.token ?? null;
    return csrfToken;
  } catch {
    return null;
  }
}

const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "pages.blockHeading",
  paragraph: "pages.blockParagraph",
  image: "pages.blockImage",
  button: "pages.blockButton",
  list: "pages.blockList",
  quote: "pages.blockQuote",
  code: "pages.blockCode",
  divider: "pages.blockDivider",
  html: "pages.blockHtml",
};

function blockDefaults(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "New heading", level: 2 };
    case "paragraph":
      return { text: "Write something…" };
    case "image":
      return { url: "https://picsum.photos/1200/600", alt: "", caption: "" };
    case "button":
      return { text: "Learn more", href: "https://", style: "solid" };
    case "list":
      return { ordered: false, items: ["First item", "Second item"] };
    case "quote":
      return { text: "A great quote…", author: "" };
    case "code":
      return { code: "console.log('hello')", language: "js" };
    case "html":
      return { html: "<div><strong>Custom HTML</strong></div>" };
    default:
      return {};
  }
}

function newBlock(type: BlockType): PageBlock {
  return { id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), type, props: blockDefaults(type) };
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

const emptySeo: PageSeo = { title: "", description: "", keywords: "", ogImage: "", canonical: "", noIndex: false };

export function PagesManager() {
  const t = useTranslations("adminPages");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const [items, setItems] = useState<PageItem[]>([]);
  const [sitePages, setSitePages] = useState<SitePageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorTab, setEditorTab] = useState("blocks");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "pending">("idle");
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/pages?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setItems(data.pages ?? []);
      setSitePages(data.sitePages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, t]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const mutate = async (url: string, method: "PATCH" | "POST" | "DELETE", body?: unknown) => {
    const token = await getCsrfToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["x-csrf-token"] = token;
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
    return data;
  };

  const openCreate = () => {
    setNewTitle("");
    setNewSlug("");
    setCreateOpen(true);
  };

  const doCreate = async () => {
    if (!newTitle.trim()) {
      setNotice(t("pages.titleRequired"));
      return;
    }
    setCreating(true);
    setNotice(null);
    try {
      const data = await mutate("/api/admin/pages", "POST", {
        title: newTitle.trim(),
        slug: newSlug.trim() ? toSlug(newSlug.trim()) : undefined,
        content: [],
        seo: emptySeo,
        isPublic: true,
        requiresAuth: false,
        status: "draft",
      });
      setCreateOpen(false);
      await fetchPages();
      const created = data.page;
      setEditor({
        id: created.id,
        title: created.title,
        slug: created.slug,
        isPublic: true,
        requiresAuth: false,
        seo: { ...emptySeo },
        blocks: [],
      });
      lastSavedRef.current = "";
      setNotice(t("pages.created"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (page: PageItem) => {
    setBusy(`load-${page.id}`);
    setNotice(null);
    fetch(`/api/admin/pages/${page.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          const p = data.page;
          setEditor({
            id: p.id,
            title: p.title,
            slug: p.slug,
            isPublic: p.isPublic,
            requiresAuth: p.requiresAuth,
            seo: { ...emptySeo, ...(p.seo ?? {}) },
            blocks: Array.isArray(p.content) ? p.content : [],
          });
          lastSavedRef.current = JSON.stringify({ content: p.content, seo: p.seo });
          setSaveState("saved");
        } else {
          setNotice(data.error || t("common.somethingWentWrong"));
        }
      })
      .catch(() => setNotice(t("common.somethingWentWrong")))
      .finally(() => setBusy(null));
  };

  const closeEditor = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditor(null);
    setSaveState("idle");
  };

  const editorSnapshot = (state: EditorState) =>
    JSON.stringify({ content: state.blocks, seo: state.seo, title: state.title, slug: state.slug });

  const updateEditor = (patch: Partial<EditorState>) => {
    setEditor((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setSaveState("pending");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (editorSnapshot(next) === lastSavedRef.current) return;
        setSaveState("saving");
        mutate(`/api/admin/pages/${next.id}`, "PATCH", { action: "autosave", content: next.blocks, seo: next.seo })
          .then(() => {
            lastSavedRef.current = editorSnapshot(next);
            setSaveState("saved");
          })
          .catch(() => setSaveState("pending"));
      }, 2000);
      return next;
    });
  };

  const setBlockProps = (id: string, props: Record<string, unknown>) => {
    updateEditor({ blocks: (editor?.blocks ?? []).map((b) => (b.id === id ? { ...b, props } : b)) });
  };

  const addBlock = (type: BlockType) => {
    updateEditor({ blocks: [...(editor?.blocks ?? []), newBlock(type)] });
  };

  const removeBlock = (id: string) => {
    updateEditor({ blocks: (editor?.blocks ?? []).filter((b) => b.id !== id) });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    if (!editor) return;
    const blocks = [...editor.blocks];
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    updateEditor({ blocks });
  };

  const saveEditor = async (publish: boolean) => {
    if (!editor) return;
    setBusy("save");
    setNotice(null);
    try {
      const status = publish ? "published" : editor.id && items.find((i) => i.id === editor.id)?.status;
      const data = await mutate(`/api/admin/pages/${editor.id}`, "PATCH", {
        title: editor.title.trim(),
        slug: toSlug(editor.slug) || editor.slug,
        isPublic: editor.isPublic,
        requiresAuth: editor.requiresAuth,
        seo: editor.seo,
        content: editor.blocks,
        status,
      });
      lastSavedRef.current = editorSnapshot(editor);
      setSaveState("saved");
      if (publish) {
        await mutate(`/api/admin/pages/${editor.id}`, "PATCH", { action: "publish" });
      }
      const updated = data.page;
      setItems((prev) =>
        prev.map((i) =>
          i.id === updated.id
            ? { ...i, title: updated.title, slug: updated.slug, status: updated.status, version: updated.version }
            : i
        )
      );
      setNotice(publish ? t("pages.published") : t("pages.saved"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const togglePublish = async (page: PageItem) => {
    setBusy(`publish-${page.id}`);
    setNotice(null);
    try {
      await mutate(`/api/admin/pages/${page.id}`, "PATCH", {
        action: page.status === "published" ? "unpublish" : "publish",
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === page.id ? { ...i, status: i.status === "published" ? "draft" : "published" } : i
        )
      );
      setNotice(page.status === "published" ? t("pages.unpublished") : t("pages.published"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const clone = async (page: PageItem) => {
    setBusy(`clone-${page.id}`);
    setNotice(null);
    try {
      await mutate(`/api/admin/pages/${page.id}/clone`, "POST", {});
      await fetchPages();
      setNotice(t("pages.cloned"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (page: PageItem) => {
    setBusy(`delete-${page.id}`);
    setNotice(null);
    try {
      await mutate(`/api/admin/pages/${page.id}`, "DELETE");
      setItems((prev) => prev.filter((i) => i.id !== page.id));
      setNotice(t("pages.deleted"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card glass>
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-charcoal-100">{t("pages.title")}</h2>
            <p className="text-sm text-charcoal-500 mt-1">{t("pages.hint")}</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("pages.newPage")}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("pages.search")}
              className="ps-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "draft", "published"] as const).map((value) => (
              <Button
                key={value}
                variant={statusFilter === value ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(value)}
              >
                {t(value === "all" ? "pages.filterAll" : value === "draft" ? "pages.filterDraft" : "pages.filterPublished")}
              </Button>
            ))}
          </div>
        </div>

        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-charcoal-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal-800 py-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-charcoal-600 mb-3" />
            <p className="text-charcoal-400">{t("pages.noPages")}</p>
            <Button className="mt-4" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("pages.newPage")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((page) => (
              <div
                key={page.id}
                className="rounded-xl border border-charcoal-800 bg-charcoal-900/40 p-4 space-y-3 transition-colors hover:border-emerald-500/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-charcoal-100 truncate">{page.title}</h3>
                    <p className="text-xs text-charcoal-500 mt-0.5 break-all">/pages/{page.slug}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant={page.status === "published" ? "emerald" : "outline"}>
                      {page.status === "published" ? t("pages.statusPublished") : t("pages.statusDraft")}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-charcoal-500">
                  <span className="flex items-center gap-1">
                    {page.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {page.isPublic ? t("pages.public") : t("pages.private")}
                  </span>
                  {page.requiresAuth && (
                    <span className="flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      {t("pages.requiresAuth")}
                    </span>
                  )}
                  <span>{t("pages.version")} {page.version}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(page)} disabled={busy === `load-${page.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t("pages.edit")}
                  </Button>
                  {page.status === "published" && page.isPublic && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/${locale}/pages/${page.slug}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("pages.view")}
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => clone(page)} disabled={busy === `clone-${page.id}`}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant={page.status === "published" ? "outline" : "primary"}
                    onClick={() => togglePublish(page)}
                    disabled={busy === `publish-${page.id}`}
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    {page.status === "published" ? t("pages.unpublish") : t("pages.publish")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => remove(page)}
                    disabled={busy === `delete-${page.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sitePages.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-charcoal-100">
                {t("sitePages.title")}
              </h2>
              <Badge variant="outline">{sitePages.length}</Badge>
            </div>
            <div className="rounded-xl border border-charcoal-800 divide-y divide-charcoal-800/50">
              {sitePages.map((sp, i) => (
                <div key={`${sp.path}-${i}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-charcoal-200">
                        {sp.kind === "cms" ? sp.title : t(`sitePages.${sp.title}`) || sp.title}
                      </span>
                      <Badge variant={sp.kind === "cms" ? "emerald" : "outline"} size="sm">
                        {t(`sitePages.kind${sp.kind === "cms" ? "Cms" : "Route"}`)}
                      </Badge>
                      {sp.group !== "cms" && (
                        <Badge variant="outline" size="sm">
                          {t(`sitePages.group${sp.group.charAt(0).toUpperCase()}${sp.group.slice(1)}`)}
                        </Badge>
                      )}
                    </div>
                    <code className="text-xs text-charcoal-500">{sp.path}</code>
                  </div>
                  <div className="flex gap-1.5">
                    {sp.editPath && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={sp.editPath}>
                          <Pencil className="h-3.5 w-3.5" />
                          {t("pages.edit")}
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/${locale}${sp.path}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("pages.createTitle")}
        description={t("pages.createHint")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.titleField")}</label>
            <Input
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (!newSlug) setNewSlug(toSlug(e.target.value));
              }}
              placeholder={t("pages.titlePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.slug")}</label>
            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="about-us" />
            <p className="text-xs text-charcoal-500 mt-1.5">{t("pages.slugHint")}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={doCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("pages.create")}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!editor}
        onClose={closeEditor}
        title={t("pages.editTitle")}
        description={editor?.slug ? `/pages/${editor.slug}` : undefined}
        size="xl"
      >
        {editor && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-charcoal-500">
                {saveState === "saving" && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("pages.autosaveSaving")}
                  </span>
                )}
                {saveState === "saved" && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="h-3 w-3" />
                    {t("pages.autosaveSaved")}
                  </span>
                )}
                {saveState === "pending" && <span>{t("pages.autosavePending")}</span>}
                <span className="text-charcoal-600">|</span>
                <span>
                  {t("pages.version")} {items.find((i) => i.id === editor.id)?.version ?? 1}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => saveEditor(false)} disabled={busy === "save"}>
                  <Save className="h-3.5 w-3.5" />
                  {t("pages.save")}
                </Button>
                <Button size="sm" onClick={() => saveEditor(true)} disabled={busy === "save"}>
                  <Rocket className="h-3.5 w-3.5" />
                  {t("pages.savePublish")}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.titleField")}</label>
                  <Input value={editor.title} onChange={(e) => updateEditor({ title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.slug")}</label>
                  <Input
                    value={editor.slug}
                    onChange={(e) => updateEditor({ slug: e.target.value })}
                    placeholder="about-us"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 text-charcoal-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editor.isPublic}
                    onChange={(e) => updateEditor({ isPublic: e.target.checked })}
                    className="rounded border-charcoal-700 bg-charcoal-900 accent-emerald-500"
                  />
                  {t("pages.isPublic")}
                </label>
                <label className="flex items-center gap-2 text-charcoal-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editor.requiresAuth}
                    onChange={(e) => updateEditor({ requiresAuth: e.target.checked })}
                    className="rounded border-charcoal-700 bg-charcoal-900 accent-emerald-500"
                  />
                  {t("pages.requiresAuth")}
                </label>
              </div>
            </div>

            <Tabs value={editorTab} onValueChange={setEditorTab}>
              <TabsList>
                <TabsTrigger value="blocks">{t("pages.blocks")}</TabsTrigger>
                <TabsTrigger value="preview">{t("pages.preview")}</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="blocks" className="space-y-3 pt-4">
                <div className="flex flex-wrap gap-2">
                  {(
                    ["heading", "paragraph", "image", "button", "list", "quote", "code", "divider", "html"] as const
                  ).map((type) => (
                    <Button key={type} size="sm" variant="outline" onClick={() => addBlock(type)}>
                      <Plus className="h-3.5 w-3.5" />
                      {t(BLOCK_LABELS[type])}
                    </Button>
                  ))}
                </div>

                {editor.blocks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-charcoal-800 py-12 text-center text-sm text-charcoal-500">
                    {t("pages.noBlocks")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editor.blocks.map((block, index) => (
                      <BlockEditorRow
                        key={block.id}
                        block={block}
                        t={t}
                        onChange={(props) => setBlockProps(block.id, props)}
                        onRemove={() => removeBlock(block.id)}
                        onMove={(dir) => moveBlock(index, dir)}
                        isFirst={index === 0}
                        isLast={index === editor.blocks.length - 1}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="pt-4">
                <div className="rounded-xl border border-charcoal-800 bg-surface p-8">
                  <h1 className="text-2xl font-bold text-charcoal-100 mb-6">{editor.title}</h1>
                  <BlocksRenderer blocks={editor.blocks} />
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.seoTitle")}</label>
                    <Input value={editor.seo.title ?? ""} onChange={(e) => updateEditor({ seo: { ...editor.seo, title: e.target.value } })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.seoKeywords")}</label>
                    <Input value={editor.seo.keywords ?? ""} onChange={(e) => updateEditor({ seo: { ...editor.seo, keywords: e.target.value } })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.seoDescription")}</label>
                    <Textarea rows={2} value={editor.seo.description ?? ""} onChange={(e) => updateEditor({ seo: { ...editor.seo, description: e.target.value } })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.seoOgImage")}</label>
                    <Input value={editor.seo.ogImage ?? ""} onChange={(e) => updateEditor({ seo: { ...editor.seo, ogImage: e.target.value } })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-300 mb-1.5">{t("pages.seoCanonical")}</label>
                    <Input value={editor.seo.canonical ?? ""} onChange={(e) => updateEditor({ seo: { ...editor.seo, canonical: e.target.value } })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-charcoal-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editor.seo.noIndex}
                      onChange={(e) => updateEditor({ seo: { ...editor.seo, noIndex: e.target.checked } })}
                      className="rounded border-charcoal-700 bg-charcoal-900 accent-emerald-500"
                    />
                    {t("pages.seoNoIndex")}
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

function BlockEditorRow({
  block,
  t,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  block: PageBlock;
  t: (key: string) => string;
  onChange: (props: Record<string, unknown>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const props = block.props;
  const set = (patch: Record<string, unknown>) => onChange({ ...props, ...patch });

  const renderFields = () => {
    switch (block.type) {
      case "heading":
        return (
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldText")}</label>
              <Input value={String(props.text ?? "")} onChange={(e) => set({ text: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldLevel")}</label>
              <select
                className="w-full h-10 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
                value={String(props.level ?? 2)}
                onChange={(e) => set({ level: Number(e.target.value) })}
              >
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
              </select>
            </div>
          </div>
        );
      case "paragraph":
        return (
          <div>
            <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldText")}</label>
            <Textarea rows={3} value={String(props.text ?? "")} onChange={(e) => set({ text: e.target.value })} />
          </div>
        );
      case "image":
        return (
          <div className="grid gap-3">
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldUrl")}</label>
              <Input value={String(props.url ?? "")} onChange={(e) => set({ url: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldAlt")}</label>
                <Input value={String(props.alt ?? "")} onChange={(e) => set({ alt: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldCaption")}</label>
                <Input value={String(props.caption ?? "")} onChange={(e) => set({ caption: e.target.value })} />
              </div>
            </div>
          </div>
        );
      case "button":
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldText")}</label>
              <Input value={String(props.text ?? "")} onChange={(e) => set({ text: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldHref")}</label>
              <Input value={String(props.href ?? "")} onChange={(e) => set({ href: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldStyle")}</label>
              <select
                className="w-full h-10 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
                value={String(props.style ?? "solid")}
                onChange={(e) => set({ style: e.target.value })}
              >
                <option value="solid">Solid</option>
                <option value="ghost">Ghost</option>
              </select>
            </div>
          </div>
        );
      case "list":
        return (
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldItems")}</label>
              <Textarea
                rows={3}
                value={(props.items as string[] ?? []).join("\n")}
                onChange={(e) => set({ items: e.target.value.split("\n") })}
              />
            </div>
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldOrdered")}</label>
              <select
                className="w-full h-10 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
                value={props.ordered === true ? "1" : "0"}
                onChange={(e) => set({ ordered: e.target.value === "1" })}
              >
                <option value="0">Bullets</option>
                <option value="1">Numbers</option>
              </select>
            </div>
          </div>
        );
      case "quote":
        return (
          <div className="grid gap-3">
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldText")}</label>
              <Textarea rows={2} value={String(props.text ?? "")} onChange={(e) => set({ text: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldAuthor")}</label>
              <Input value={String(props.author ?? "")} onChange={(e) => set({ author: e.target.value })} />
            </div>
          </div>
        );
      case "code":
        return (
          <div className="grid gap-3">
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldLanguage")}</label>
              <Input value={String(props.language ?? "")} onChange={(e) => set({ language: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldCode")}</label>
              <Textarea rows={4} className="font-mono" value={String(props.code ?? "")} onChange={(e) => set({ code: e.target.value })} />
            </div>
          </div>
        );
      case "html":
        return (
          <div>
            <label className="block text-xs text-charcoal-500 mb-1">{t("pages.fieldHtml")}</label>
            <Textarea rows={4} className="font-mono" value={String(props.html ?? "")} onChange={(e) => set({ html: e.target.value })} />
            <p className="text-xs text-charcoal-600 mt-1.5">{t("pages.htmlWarning")}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-charcoal-800 bg-charcoal-900/40 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <Badge variant="outline">{t(BLOCK_LABELS[block.type])}</Badge>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onMove(-1)} disabled={isFirst} className="h-8 w-8 p-0">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onMove(1)} disabled={isLast} className="h-8 w-8 p-0">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {renderFields()}
    </div>
  );
}