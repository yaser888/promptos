"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  Search,
  Layers,
  Copy,
  Heart,
  Eye,
  SlidersHorizontal,
  Grid3X3,
  List,
  ArrowUpDown,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Star,
  Share2,
  CopyPlus,
  Bookmark,
  Plus,
  X,
} from "lucide-react";
import { useAuthUser } from "@/components/providers/auth-provider";
import Link from "next/link";

type PromptItem = {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  tone: string;
  language: string;
  complexity: string;
  tags: string[];
  viewCount: number;
  copyCount: number;
  shareCount: number;
  likeCount: number;
  rating: number;
  ratingCount: number;
  score: number;
  isFeatured: boolean;
  favorited?: boolean;
  category: { id: string; name: string; slug: string } | null;
  user: { name: string; avatar: string | null } | null;
};

type ApiResponse = {
  data: PromptItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  cursor: string | null;
  hasMore: boolean;
};

type CollectionItem = {
  id: string;
  name: string;
  _count: { entries: number };
  containsPrompt?: boolean;
};

const platforms = [
  { value: "All", label: "All" },
  { value: "CHATGPT", label: "ChatGPT" },
  { value: "CLAUDE", label: "Claude" },
  { value: "GEMINI", label: "Gemini" },
  { value: "GROK", label: "Grok" },
  { value: "PERPLEXITY", label: "Perplexity" },
  { value: "CURSOR", label: "Cursor" },
  { value: "GITHUB_COPILOT", label: "GitHub Copilot" },
  { value: "MIDJOURNEY", label: "Midjourney" },
];
const sortOptions = [
  { value: "trending-desc", label: "🔥 Trending now" },
  { value: "createdAt-desc", label: "Newest" },
  { value: "createdAt-asc", label: "Oldest" },
  { value: "updatedAt-desc", label: "Recently updated" },
  { value: "rating-desc", label: "Top rated" },
  { value: "viewCount-desc", label: "Most viewed" },
  { value: "copyCount-desc", label: "Most copied" },
  { value: "likeCount-desc", label: "Most liked" },
];
const KEYSET_SORTS = ["createdAt", "updatedAt"];

export default function LibraryPage() {
  const t = useTranslations("library");
  const { isSignedIn } = useAuthUser();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [infinite, setInfinite] = useState(false);

  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const [saveDialogFor, setSaveDialogFor] = useState<PromptItem | null>(null);
  const [dialogSaved, setDialogSaved] = useState<Set<string>>(new Set());
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedPromptIds, setSavedPromptIds] = useState<Set<string>>(new Set());

  const isKeysetSort = KEYSET_SORTS.includes(sortBy);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.data)) setCategories(d.data);
        else if (Array.isArray(d)) setCategories(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/prompts/tags?limit=60")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.tags)) setTags(d.tags);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setCollections([]);
      setCollectionFilter(null);
      return;
    }
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.collections) setCollections(d.collections);
      })
      .catch(() => {});
  }, [isSignedIn]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const buildParams = useCallback(
    (opts: { cursor?: string | null; page?: number } = {}) => {
      const params = new URLSearchParams({
        pageSize: "12",
        sortBy,
        sortOrder,
      });
      if (infinite) params.set("limit", "12");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (platform !== "All") params.set("platform", platform);
      if (categoryId) params.set("categoryId", categoryId);
      if (selectedTags.length) params.set("tags", selectedTags.join(","));
      if (favoritesOnly) params.set("favorites", "true");
      if (collectionFilter) params.set("collectionId", collectionFilter);
      if (opts.cursor) params.set("cursor", opts.cursor);
      if (opts.page) params.set("page", String(opts.page));
      return params;
    },
    [
      debouncedSearch,
      platform,
      categoryId,
      selectedTags,
      favoritesOnly,
      collectionFilter,
      sortBy,
      sortOrder,
      infinite,
    ]
  );

  const mergeFavoriteFlags = useCallback(
    (items: PromptItem[]) => {
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        items.forEach((p) => {
          if (p.favorited) next.add(p.id);
          else next.delete(p.id);
        });
        return next;
      });
    },
    []
  );

  const fetchList = useCallback(
    async (opts: { reset?: boolean; cursor?: string | null; page?: number } = {}) => {
      const reset = opts.reset !== false;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const params = buildParams(opts);
      try {
        const res = await fetch(`/api/prompts?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiResponse = await res.json();
        if (reset) {
          setPrompts(data.data);
          setPage(data.page ?? 1);
        } else {
          setPrompts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...data.data.filter((p) => !seen.has(p.id))];
          });
          setPage(data.page ?? 1);
        }
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
        setCursor(data.cursor ?? null);
        setHasMore(
          data.hasMore ?? (data.totalPages ? data.totalPages > (data.page ?? 1) : false)
        );
        mergeFavoriteFlags(data.data);
      } catch (e) {
        console.error(e);
        setError("Failed to load prompts");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildParams, mergeFavoriteFlags]
  );

  useEffect(() => {
    setPage(1);
    setCursor(null);
    fetchList({ reset: true });
  }, [debouncedSearch, platform, categoryId, selectedTags.join(","), favoritesOnly, collectionFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (!infinite || !hasMore || loading || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        const next = isKeysetSort ? { cursor } : { page: page + 1 };
        fetchList({ reset: false, ...next });
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [infinite, hasMore, loading, loadingMore, cursor, page, isKeysetSort, fetchList]);

  const handleCopy = async (prompt: PromptItem) => {
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`);
      if (!res.ok) return;
      const data = await res.json();
      await navigator.clipboard.writeText(data.content || "");
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast(t("copied"));
      fetch(`/api/prompts/${prompt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy" }),
      }).catch(() => {});
    } catch {}
  };

  const handleCopyTitle = async (prompt: PromptItem) => {
    try {
      await navigator.clipboard.writeText(prompt.title);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast(t("copied"));
      fetch(`/api/prompts/${prompt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy" }),
      }).catch(() => {});
    } catch {}
  };

  const handleFavorite = async (prompt: PromptItem) => {
    if (!isSignedIn) {
      showToast(t("requiresSignIn"));
      return;
    }
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite" }),
      });
      if (res.ok) {
        const result = await res.json();
        setFavoritedIds((prev) => {
          const next = new Set(prev);
          if (result.favorited) next.add(prompt.id);
          else next.delete(prompt.id);
          return next;
        });
        if (favoritesOnly && !result.favorited) {
          setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
        }
      }
    } catch {}
  };

  const handleShare = async (prompt: PromptItem) => {
    const url = `${window.location.origin}/prompts/${prompt.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: prompt.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t("shared"));
      }
    } catch {}
    fetch(`/api/prompts/${prompt.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "share" }),
    }).catch(() => {});
  };

  const handleDuplicate = async (prompt: PromptItem) => {
    if (!isLoggedIn) {
      showToast(t("requiresSignIn"));
      return;
    }
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(t("duplicated"));
        window.open(`/prompts/${data.prompt?.id ?? prompt.id}`, "_blank");
      }
    } catch {}
  };

  const openSaveDialog = async (prompt: PromptItem) => {
    if (!isLoggedIn) {
      showToast(t("requiresSignIn"));
      return;
    }
    setSaveDialogFor(prompt);
    const res = await fetch(`/api/collections?promptId=${prompt.id}`);
    if (res.ok) {
      const d = await res.json();
      setCollections(d.collections);
      setDialogSaved(
        new Set(
          d.collections.filter((c: CollectionItem) => c.containsPrompt).map((c: CollectionItem) => c.id)
        )
      );
    }
  };

  const handleSaveToggle = async (collectionId: string, savedVal: boolean) => {
    if (!saveDialogFor) return;
    const promptId = saveDialogFor.id;
    setDialogSaved((prev) => {
      const next = new Set(prev);
      if (savedVal) next.add(collectionId);
      else next.delete(collectionId);
      return next;
    });
    setSavedPromptIds((prev) => {
      const next = new Set(prev);
      if (savedVal) next.add(promptId);
      else next.delete(promptId);
      return next;
    });
    try {
      await fetch(`/api/collections/${collectionId}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId, saved: savedVal }),
      });
    } catch {}
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !saveDialogFor) return;
    setCreatingCollection(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setCollections((prev) => [...prev, d.collection]);
        setDialogSaved((prev) => new Set(prev).add(d.collection.id));
        setNewCollectionName("");
      }
    } finally {
      setCreatingCollection(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  };

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === categoryId)?.name,
    [categories, categoryId]
  );

  const isLoggedIn = isSignedIn;

  return (
    <>
      <Header />
      <main className="pt-24 pb-16">
        <Container>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-charcoal-100">{t("title")}</h1>
            <p className="text-charcoal-400 mt-2">{t("subtitle")}</p>
          </div>

          {/* Search & Controls */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFilters((s) => !s)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("filter")}
                </Button>
                <div className="relative">
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [sb, so] = e.target.value.split("-");
                      setSortBy(sb);
                      setSortOrder(so as "asc" | "desc");
                    }}
                    className="h-10 rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 pr-8 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ArrowUpDown className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal-500" />
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setView("grid")}>
                  <Grid3X3 className={`h-4 w-4 ${view === "grid" ? "text-emerald-400" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setView("list")}>
                  <List className={`h-4 w-4 ${view === "list" ? "text-emerald-400" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Pagination mode toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-500">{t("paginationMode")}</span>
              <button
                onClick={() => setInfinite(false)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  !infinite
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                }`}
              >
                {t("paginated")}
              </button>
              <button
                onClick={() => setInfinite(true)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  infinite
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                }`}
              >
                {t("infinite")}
              </button>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl border border-charcoal-800 bg-charcoal-900/40">
              <div>
                <p className="text-xs font-medium text-charcoal-500 mb-2">{t("platform")}</p>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        platform === p.value
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {categories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-charcoal-500 mb-2">{t("category")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setCategoryId(null)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        categoryId === null
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                      }`}
                    >
                      {t("allCategories")}
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                          categoryId === cat.id
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-charcoal-500 mb-2">{t("tags")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTags([])}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        selectedTags.length === 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                      }`}
                    >
                      {t("allTags")}
                    </button>
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                          selectedTags.includes(tag)
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isLoggedIn && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-charcoal-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={favoritesOnly}
                      onChange={(e) => setFavoritesOnly(e.target.checked)}
                      className="accent-emerald-500 h-4 w-4"
                    />
                    {t("favoritesOnly")}
                  </label>
                  {collections.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-charcoal-500 mb-2">{t("collections")}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setCollectionFilter(null)}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                            collectionFilter === null
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                          }`}
                        >
                          {t("allCollections")}
                        </button>
                        {collections.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setCollectionFilter(c.id)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                              collectionFilter === c.id
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-charcoal-800/50 text-charcoal-400 hover:text-charcoal-200 border border-charcoal-800"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results meta */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-charcoal-500">
              {loading ? t("loading") : `${total} ${t("results")}`}
              {activeCategory ? ` ${t("inCategory", { category: activeCategory })}` : ""}
            </p>
          </div>

          {/* Prompts Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="text-center py-24 text-charcoal-500">{error}</div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-24">
              <Layers className="h-12 w-12 text-charcoal-700 mx-auto mb-4" />
              <p className="text-charcoal-400">{t("noResults")}</p>
            </div>
          ) : (
            <>
              <div
                className={
                  view === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    : "flex flex-col gap-3"
                }
              >
                {prompts.map((prompt) => (
                  <Card key={prompt.id} glass hover className={`p-5 group ${view === "list" ? "flex items-center gap-4" : ""}`}>
                    <div className={`flex items-start justify-between mb-3 ${view === "list" ? "w-full shrink-0" : ""}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                        <Layers className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex items-center gap-1">
                        {isLoggedIn && (
                          <button
                            onClick={() => handleFavorite(prompt)}
                            className="p-1.5 rounded-lg transition-all hover:bg-charcoal-800"
                            title={t("addToFavorites")}
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${
                                favoritedIds.has(prompt.id)
                                  ? "text-rose-400 fill-rose-400"
                                  : "text-charcoal-500 hover:text-rose-400"
                              }`}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyTitle(prompt)}
                          className="p-1.5 rounded-lg transition-all hover:bg-charcoal-800"
                          title={t("copy")}
                        >
                          {copiedId === prompt.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-charcoal-500 hover:text-charcoal-200" />
                          )}
                        </button>
                        <button
                          onClick={() => handleShare(prompt)}
                          className="p-1.5 rounded-lg transition-all hover:bg-charcoal-800"
                          title={t("share")}
                        >
                          <Share2 className="h-3.5 w-3.5 text-charcoal-500 hover:text-charcoal-200" />
                        </button>
                        {isLoggedIn && (
                          <button
                            onClick={() => openSaveDialog(prompt)}
                            className="p-1.5 rounded-lg transition-all hover:bg-charcoal-800"
                            title={t("addToCollection")}
                          >
                            <Bookmark
                              className={`h-3.5 w-3.5 ${
                                savedPromptIds.has(prompt.id)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-charcoal-500 hover:text-charcoal-200"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className={view === "list" ? "flex-1 min-w-0" : ""}>
                      <Link href={`/prompts/${prompt.id}`}>
                        <h3 className="text-sm font-semibold text-charcoal-200 mb-1 group-hover:text-emerald-400 transition-colors line-clamp-1 cursor-pointer">
                          {prompt.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-charcoal-500 mb-3 line-clamp-2">
                        {prompt.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="emerald" size="sm">
                        {prompt.platform.toLowerCase()}
                      </Badge>
                      {prompt.category && (
                        <Badge variant="default" size="sm">
                          {prompt.category.name}
                        </Badge>
                      )}
                      {prompt.ratingCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 ms-auto">
                          <Star className="h-3 w-3 fill-amber-400" />
                          {prompt.rating.toFixed(1)}
                          <span className="text-charcoal-600">({prompt.ratingCount})</span>
                        </span>
                      )}
                    </div>
                    {prompt.tags.length > 0 && (
                      <div className="flex items-center gap-3 text-xs text-charcoal-500 mb-3 flex-wrap">
                        {prompt.tags.slice(0, 4).map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className="hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-charcoal-800/50">
                      <span className="text-xs text-charcoal-600">
                        by {prompt.user?.name || "Anonymous"}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-charcoal-500">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {prompt.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Copy className="h-3 w-3" /> {prompt.copyCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {prompt.likeCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Link href={`/prompts/${prompt.id}`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          {t("view")}
                        </Button>
                      </Link>
                      <Button variant="primary" size="sm" className="flex-1" onClick={() => handleCopy(prompt)}>
                        {copiedId === prompt.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            {t("copied")}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            {t("copy")}
                          </>
                        )}
                      </Button>
                      {isLoggedIn && (
                        <Button variant="secondary" size="sm" onClick={() => handleDuplicate(prompt)} title={t("duplicate")}>
                          <CopyPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {loadingMore && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                </div>
              )}

              {infinite && hasMore && !loadingMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      fetchList({ reset: false, ...(isKeysetSort ? { cursor } : { page: page + 1 }) })
                    }
                  >
                    {t("loadMore")}
                  </Button>
                </div>
              )}
              {infinite && !hasMore && prompts.length > 0 && (
                <p className="text-center text-xs text-charcoal-600 py-6">{t("noMore")}</p>
              )}
            </>
          )}

          {/* Pagination */}
          {!infinite && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  fetchList({ reset: false, page: Math.max(1, page - 1) });
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("previous")}
              </Button>
              <span className="text-sm text-charcoal-400">
                {t("pageOf", { page, total: totalPages })}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  fetchList({ reset: false, page: Math.min(totalPages, page + 1) });
                }}
              >
                {t("next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Container>
      </main>
      <Footer />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-charcoal-800 border border-charcoal-700 text-sm text-charcoal-100 shadow-lg">
          {toast}
        </div>
      )}

      {/* Save-to-collection dialog */}
      {saveDialogFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSaveDialogFor(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-charcoal-800 bg-charcoal-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-charcoal-100">{t("addToCollection")}</h3>
              <button
                onClick={() => setSaveDialogFor(null)}
                className="p-1 rounded-lg hover:bg-charcoal-800"
              >
                <X className="h-4 w-4 text-charcoal-500" />
              </button>
            </div>
            <p className="text-xs text-charcoal-500 mb-3 line-clamp-1">{saveDialogFor.title}</p>
            {collections.length === 0 && (
              <p className="text-xs text-charcoal-600 mb-3">{t("emptyCollections")}</p>
            )}
            <div className="flex flex-col gap-2 mb-4 max-h-48 overflow-auto">
              {collections.map((c) => {
                const saved = dialogSaved.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSaveToggle(c.id, !saved)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                      saved
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-charcoal-800 bg-charcoal-900/50 text-charcoal-300 hover:border-charcoal-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-emerald-400 text-emerald-400" : ""}`} />
                      {c.name}
                    </span>
                    <span className="text-xs text-charcoal-600">{c._count.entries}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder={t("newCollectionPlaceholder")}
                className="flex h-9 flex-1 rounded-lg border border-charcoal-800 bg-charcoal-900/50 px-3 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!newCollectionName.trim() || creatingCollection}
                onClick={handleCreateCollection}
              >
                {creatingCollection ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {t("createCollection")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}