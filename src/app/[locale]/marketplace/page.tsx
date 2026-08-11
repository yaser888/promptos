"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/components/providers/auth-provider";
import {
  Store,
  Search,
  Star,
  Download,
  ShoppingCart,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  category: string | null;
  author: string;
  rating: number;
  reviews: number;
  downloads: number;
  price: number;
  tags: string[];
  badge: string | null;
};

type ApiResponse = {
  data: Listing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const platforms = [
  { value: "All", label: "All" },
  { value: "CHATGPT", label: "ChatGPT" },
  { value: "CLAUDE", label: "Claude" },
  { value: "GEMINI", label: "Gemini" },
  { value: "GROK", label: "Grok" },
  { value: "PERPLEXITY", label: "Perplexity" },
  { value: "CURSOR", label: "Cursor" },
  { value: "MIDJOURNEY", label: "Midjourney" },
];

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const { toast } = useToast();
  const { isSignedIn } = useAuthUser();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [page, setPage] = useState(1);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [revealedContent, setRevealedContent] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "12" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (platform !== "All") params.set("platform", platform);

    try {
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      setListings(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
      setError("Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, platform]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, platform]);

  const handlePurchase = async (listing: Listing) => {
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "Create an account to purchase prompts.",
        variant: "error",
      });
      return;
    }

    setPurchasingId(listing.id);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Purchase failed");
      }

      const result = await res.json();
      setPurchasedIds((prev) => new Set(prev).add(listing.id));
      setRevealedContent((prev) => ({ ...prev, [listing.id]: result.content }));
      toast({
        title: "Purchase successful",
        description: `You now own "${result.title}".`,
      });
    } catch (e: any) {
      toast({
        title: "Purchase failed",
        description: e.message || "Something went wrong",
        variant: "error",
      });
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16">
        <Container>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-charcoal-100">{t("title")}</h1>
              <p className="text-charcoal-400 mt-2">{t("subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="flex h-12 w-full rounded-xl border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {platforms.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`px-3 py-2 text-xs rounded-lg whitespace-nowrap transition-all ${
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

          <p className="text-sm text-charcoal-500 mb-4">
            {loading ? "Loading..." : `${total} listings`}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="text-center py-24 text-charcoal-500">{error}</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-24">
              <Store className="h-12 w-12 text-charcoal-700 mx-auto mb-4" />
              <p className="text-charcoal-400">No listings found</p>
              <p className="text-charcoal-600 text-sm mt-1">
                Try a different search or filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((item) => (
                <Card key={item.id} glass hover className="p-5 group flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                      <Store className="h-6 w-6 text-emerald-400" />
                    </div>
                    {item.badge && (
                      <Badge variant="emerald" size="sm">{item.badge}</Badge>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-charcoal-200 mb-1 group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-charcoal-500 mb-3 line-clamp-2 flex-1">
                    {item.description || "Professional premium prompt"}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="default" size="sm">{item.platform.toLowerCase()}</Badge>
                    {item.category && (
                      <Badge variant="default" size="sm">{item.category}</Badge>
                    )}
                    <span className="text-xs text-charcoal-500 ms-auto">
                      by {item.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-charcoal-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      {item.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" />
                      {item.downloads.toLocaleString()}
                    </span>
                  </div>

                  {revealedContent[item.id] ? (
                    <div className="rounded-xl bg-charcoal-950 p-4 border border-emerald-500/30 max-h-44 overflow-y-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">Owned</span>
                      </div>
                      <pre className="text-xs text-charcoal-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {revealedContent[item.id]}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-4 border-t border-charcoal-800/50">
                      <span className="text-xl font-bold text-charcoal-100">
                        ${item.price.toFixed(2)}
                      </span>
                      <Button
                        variant={purchasedIds.has(item.id) ? "secondary" : "primary"}
                        size="sm"
                        loading={purchasingId === item.id}
                        onClick={() => handlePurchase(item)}
                      >
                        {purchasedIds.has(item.id) ? (
                          <>
                            <Check className="h-4 w-4" />
                            Purchased
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            {t("purchase")}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-charcoal-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
