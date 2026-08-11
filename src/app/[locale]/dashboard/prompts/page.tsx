"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import {
  FileText,
  Search,
  Plus,
  Copy,
  Heart,
  Trash2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Loader2,
  Clock,
  Eye,
} from "lucide-react";

interface PromptVersion {
  id: string;
  content: string;
  version: number;
  createdAt: string;
}

interface Category {
  name: string;
  slug: string;
}

interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  platform: string;
  tone: string;
  language: string;
  complexity: string;
  isPublic: boolean;
  isFeatured: boolean;
  viewCount: number;
  copyCount: number;
  createdAt: string;
  category: Category;
  tags: string[];
  versions: PromptVersion[];
}

interface PromptsResponse {
  data: Prompt[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const platforms = ["All", "ChatGPT", "Claude", "Gemini", "Perplexity"];

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PromptsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<PromptsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const mountedRef = useRef(true);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("myOnly", "true");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (platformFilter !== "All") params.set("platform", platformFilter);
      const res = await fetch(`/api/prompts?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
      const json: PromptsResponse = await res.json();
      if (mountedRef.current) setData(json);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Failed to load prompts");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [debouncedSearch, platformFilter]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPrompts();
    return () => { mountedRef.current = false; };
  }, [fetchPrompts]);

  const handleAction = async (id: string, action: "toggle-favorite" | "delete") => {
    setActionLoading(id);
    try {
      const res =
        action === "delete"
          ? await fetch(`/api/prompts/${id}`, { method: "DELETE" })
          : await fetch(`/api/prompts/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to ${action === "delete" ? "delete" : "toggle favorite"}`);
      }
      toast({
        title: action === "delete" ? "Prompt deleted" : "Favorite toggled",
        variant: "success",
      });
      fetchPrompts();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">My Prompts</h1>
          <p className="text-charcoal-500 mt-1">Manage your prompt collection</p>
        </div>
        <Button variant="primary" onClick={() => router.push("../editor")}>
          <Plus className="h-4 w-4" />
          New Prompt
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {platforms.map((p) => (
            <Button
              key={p}
              variant={platformFilter === p ? "primary" : "secondary"}
              size="sm"
              onClick={() => setPlatformFilter(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {loading && !data && (
        <Card glass className="overflow-hidden p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-charcoal-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-charcoal-700" />
                <div className="h-3 w-1/4 rounded bg-charcoal-700" />
              </div>
              <div className="h-4 w-24 rounded bg-charcoal-700" />
              <div className="h-4 w-20 rounded bg-charcoal-700" />
            </div>
          ))}
        </Card>
      )}

      {error && (
        <Card glass className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-charcoal-300 mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchPrompts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      )}

      {!loading && !error && data && data.data.length === 0 && (
        <Card glass className="p-8 text-center">
          <FileText className="h-12 w-12 text-charcoal-700 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">No prompts yet</p>
          <p className="text-charcoal-500 text-sm mb-4">Create your first one to get started</p>
          <Button variant="primary" onClick={() => router.push("../editor")}>
            <Plus className="h-4 w-4" />
            Create Prompt
          </Button>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <div className="space-y-3">
          {data.data.map((prompt) => (
            <Card key={prompt.id} glass hover className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                    <FileText className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-charcoal-200 truncate">{prompt.title}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge variant="emerald" size="sm">{prompt.platform}</Badge>
                      {prompt.category && (
                        <Badge variant="default" size="sm">{prompt.category.name}</Badge>
                      )}
                      {prompt.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" size="sm">{tag}</Badge>
                      ))}
                      <span className="text-xs text-charcoal-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(prompt.createdAt)}
                      </span>
                    </div>
                    {prompt.description && (
                      <p className="text-xs text-charcoal-500 mt-1.5 line-clamp-1">{prompt.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden sm:flex items-center gap-3 text-xs text-charcoal-500">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{prompt.viewCount}</span>
                    <span className="flex items-center gap-1"><Copy className="h-3 w-3" />{prompt.copyCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`../editor/${prompt.id}`)}
                      className="p-2 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
                      title="Open in editor"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAction(prompt.id, "toggle-favorite")}
                      disabled={actionLoading === prompt.id}
                      className="p-2 rounded-lg text-charcoal-500 hover:text-emerald-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                      title="Toggle favorite"
                    >
                      {actionLoading === prompt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Heart className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => router.push(`../editor/${prompt.id}`)}
                      className="p-2 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
                      title="View details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAction(prompt.id, "delete")}
                      disabled={actionLoading === prompt.id}
                      className="p-2 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                      title="Delete"
                    >
                      {actionLoading === prompt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
