"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Globe,
  PenSquare,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  authorName: string;
  authorRole: string | null;
  locale: string;
  status: "DRAFT" | "PUBLISHED";
  featured: boolean;
  publishedAt: string | null;
  readingMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

const locales = ["en", "ar", "tr", "fr", "de", "es", "ru", "ja", "ko", "zh"];

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  authorName: "",
  authorRole: "",
  locale: "en",
  status: "DRAFT" as "DRAFT" | "PUBLISHED",
  featured: false,
  readingMinutes: "5",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  canonicalUrl: "",
};

export default function AdminBlogPage() {
  const t = useTranslations("adminPages");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "DRAFT" | "PUBLISHED">("all");
  const [localeFilter, setLocaleFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (localeFilter !== "all") params.set("locale", localeFilter);
      const res = await fetch(`/api/admin/blog?${params.toString()}`);
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, localeFilter, t]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      coverImage: post.coverImage || "",
      authorName: post.authorName,
      authorRole: post.authorRole || "",
      locale: post.locale,
      status: post.status,
      featured: post.featured,
      readingMinutes: String(post.readingMinutes),
      seoTitle: post.seoTitle || "",
      seoDescription: post.seoDescription || "",
      seoKeywords: post.seoKeywords || "",
      canonicalUrl: post.canonicalUrl || "",
    });
    setEditorOpen(true);
  };

  const savePost = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const url = "/api/admin/blog";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setEditorOpen(false);
      setNotice(editingId ? t("blog.postUpdated") : t("blog.postCreated"));
      fetchPosts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    setNotice(null);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          status: post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      fetchPosts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    }
  };

  const toggleFeatured = async (post: BlogPost) => {
    setNotice(null);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, featured: !post.featured }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      fetchPosts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    }
  };

  const deletePost = async (post: BlogPost) => {
    setNotice(null);
    if (!window.confirm(t("blog.deleteConfirm", { title: post.title }))) return;
    try {
      const res = await fetch("/api/admin/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("blog.postDeleted"));
      fetchPosts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const set = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <Card glass className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-charcoal-300 mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchPosts}>{t("common.tryAgain")}</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("blog.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("blog.subtitle")}</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("blog.newPost")}
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("blog.search")}
            className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-9 pe-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
        >
          <option value="all">{t("blog.allStatuses")}</option>
          <option value="PUBLISHED">{t("blog.published")}</option>
          <option value="DRAFT">{t("blog.draft")}</option>
        </select>
        <select
          value={localeFilter}
          onChange={(e) => setLocaleFilter(e.target.value)}
          className="h-10 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
        >
          <option value="all">{t("blog.allLocales")}</option>
          {locales.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <Card glass>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <p className="text-sm text-charcoal-500 text-center py-12">
              {t("blog.noPosts")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-charcoal-800/50 text-left text-xs uppercase tracking-wider text-charcoal-500">
                    <th className="px-4 py-3 font-medium">{t("blog.colTitle")}</th>
                    <th className="px-4 py-3 font-medium">{t("blog.colStatus")}</th>
                    <th className="px-4 py-3 font-medium">{t("blog.colLocale")}</th>
                    <th className="px-4 py-3 font-medium">{t("blog.colViews")}</th>
                    <th className="px-4 py-3 font-medium">{t("blog.colPublished")}</th>
                    <th className="px-4 py-3 font-medium text-end">{t("blog.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-charcoal-800/30 hover:bg-charcoal-900/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PenSquare className="h-3.5 w-3.5 text-charcoal-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-charcoal-200 font-medium truncate max-w-[280px]">
                              {post.title}
                            </p>
                            <p className="text-xs text-charcoal-600 font-mono truncate max-w-[280px]">
                              /{post.locale}/blog/{post.slug}
                            </p>
                          </div>
                          {post.featured && (
                            <Badge variant="emerald" size="sm">{t("blog.featured")}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleStatus(post)} title={t("common.togglePublishStatus")}>
                          <Badge variant={post.status === "PUBLISHED" ? "emerald" : "default"} size="sm">
                            {post.status === "PUBLISHED" ? t("blog.published") : t("blog.draft")}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-charcoal-400">
                          <Globe className="h-3 w-3" />
                          {post.locale.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-charcoal-400">{post.viewCount}</td>
                      <td className="px-4 py-3 text-charcoal-400">{formatDate(post.publishedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => toggleFeatured(post)} title={post.featured ? t("common.unfeature") : t("common.feature")}>
                            {post.featured ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(post)} title={t("blog.editPost")}>
                            <PenSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => deletePost(post)} title={t("common.delete")}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? t("blog.editPost") : t("blog.newPost")}
        description={t("blog.editorDesc")}
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pe-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("blog.titleLabel")}</label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("blog.titlePlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.slug")}</label>
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder={t("blog.slugPlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("blog.excerpt")}</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              placeholder={t("blog.excerptPlaceholder")}
              rows={2}
              className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("blog.content")}</label>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder={t("blog.contentPlaceholder")}
              rows={12}
              className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm font-mono text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("blog.coverImage")}</label>
              <input
                value={form.coverImage}
                onChange={(e) => set("coverImage", e.target.value)}
                placeholder={t("blog.coverPlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("blog.author")}</label>
              <input
                value={form.authorName}
                onChange={(e) => set("authorName", e.target.value)}
                placeholder={t("blog.authorPlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("blog.authorRole")}</label>
              <input
                value={form.authorRole}
                onChange={(e) => set("authorRole", e.target.value)}
                placeholder={t("blog.authorRolePlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("blog.readingMinutes")}</label>
              <input
                type="number"
                min={1}
                value={form.readingMinutes}
                onChange={(e) => set("readingMinutes", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("blog.colLocale")}</label>
              <select
                value={form.locale}
                onChange={(e) => set("locale", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
              >
                {locales.map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.status")}</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="DRAFT">{t("blog.draft")}</option>
                <option value="PUBLISHED">{t("blog.publishNow")}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30">
            <div>
              <p className="text-sm text-charcoal-200">{t("blog.featuredPost")}</p>
              <p className="text-xs text-charcoal-600">{t("blog.featuredPostHint")}</p>
            </div>
            <button
              onClick={() => set("featured", !form.featured)}
              className={"h-5 w-9 rounded-full transition-colors " + (form.featured ? "bg-emerald-500" : "bg-charcoal-700")}
            >
              <div className={"h-4 w-4 rounded-full bg-white transition-transform mt-0.5 " + (form.featured ? "translate-x-[18px]" : "translate-x-[2px]")} />
            </button>
          </div>

          <div className="pt-2 border-t border-charcoal-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 mb-3">
              {t("blog.seoSettings")}
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("blog.seoTitle")}</label>
                <input
                  value={form.seoTitle}
                  onChange={(e) => set("seoTitle", e.target.value)}
                  placeholder={t("blog.seoTitlePlaceholder")}
                  className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("blog.metaDescription")}</label>
                <textarea
                  value={form.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                  rows={2}
                  placeholder={t("blog.metaDescPlaceholder")}
                  className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("blog.keywords")}</label>
                <input
                  value={form.seoKeywords}
                  onChange={(e) => set("seoKeywords", e.target.value)}
                  placeholder={t("blog.keywordsPlaceholder")}
                  className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("blog.canonicalUrl")}</label>
                <input
                  value={form.canonicalUrl}
                  onChange={(e) => set("canonicalUrl", e.target.value)}
                  placeholder={t("blog.canonicalPlaceholder")}
                  className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setEditorOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={savePost} loading={saving} disabled={!form.title.trim() || !form.content.trim()}>
            {editingId ? t("common.saveChanges") : t("blog.createPost")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
