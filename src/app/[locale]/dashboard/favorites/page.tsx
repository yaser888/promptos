"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  Copy,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Loader2,
  Eye,
  Trash2,
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

interface FavoritesResponse {
  data: Prompt[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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

export default function FavoritesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<FavoritesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prompts?favorites=true");
      if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
      const json: FavoritesResponse = await res.json();
      if (mountedRef.current) setData(json);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Failed to load favorites");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFavorites();
    return () => { mountedRef.current = false; };
  }, [fetchFavorites]);

  const handleUnfavorite = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-favorite" }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to unfavorite");
      }
      toast({ title: "Removed from favorites", variant: "success" });
      fetchFavorites();
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
      <div>
        <h1 className="text-2xl font-bold text-charcoal-100">Favorites</h1>
        <p className="text-charcoal-500 mt-1">Your saved prompts collection</p>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} glass className="p-5 animate-pulse space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-charcoal-700" />
                <div className="h-8 w-8 rounded-lg bg-charcoal-700" />
              </div>
              <div className="h-4 w-3/4 rounded bg-charcoal-700" />
              <div className="h-3 w-1/2 rounded bg-charcoal-700" />
              <div className="pt-3 border-t border-charcoal-800/50">
                <div className="h-3 w-1/3 rounded bg-charcoal-700" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card glass className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-charcoal-300 mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchFavorites}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      )}

      {!loading && !error && data && data.data.length === 0 && (
        <Card glass className="p-8 text-center">
          <Heart className="h-12 w-12 text-charcoal-700 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">No favorites yet</p>
          <p className="text-charcoal-500 text-sm">Save prompts you love by tapping the heart icon</p>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((item) => (
            <Card
              key={item.id}
              glass
              hover
              className="p-5 cursor-pointer"
              onClick={() => router.push(`../editor/${item.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Heart className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`../editor/${item.id}`);
                    }}
                    className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
                    title="Open in editor"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`../editor/${item.id}`);
                    }}
                    className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
                    title="View details"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfavorite(item.id);
                    }}
                    disabled={actionLoading === item.id}
                    className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                    title="Remove from favorites"
                  >
                    {actionLoading === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-medium text-charcoal-200 mb-1">{item.title}</h3>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge variant="emerald" size="sm">{item.platform}</Badge>
                {item.category && (
                  <Badge variant="default" size="sm">{item.category.name}</Badge>
                )}
                {item.tags?.slice(0, 1).map((tag) => (
                  <Badge key={tag} variant="outline" size="sm">{tag}</Badge>
                ))}
                <span className="text-xs text-charcoal-600">{formatDate(item.createdAt)}</span>
              </div>
              {item.description && (
                <p className="text-xs text-charcoal-500 mb-4 line-clamp-2">{item.description}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-charcoal-800/50">
                <div className="flex items-center gap-3 text-xs text-charcoal-500">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.viewCount}</span>
                  <span className="flex items-center gap-1"><Copy className="h-3 w-3" />{item.copyCount}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
