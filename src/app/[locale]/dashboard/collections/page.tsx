"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FolderOpen, Plus, Lock, Loader2, AlertCircle, Inbox } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  promptCount: number;
  createdAt: string;
  updatedAt: string;
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isPrivate: false });

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      const data = await res.json();
      setCollections(data.collections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          isPrivate: form.isPrivate,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create collection");
      }
      setCreateOpen(false);
      setForm({ name: "", description: "", isPrivate: false });
      setNotice("Collection created");
      fetchCollections();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">Collections</h1>
          <p className="text-charcoal-500 mt-1">
            Organize your prompts into collections
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
        </div>
      )}

      {error && !loading && (
        <Card glass className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-charcoal-300 mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchCollections}>Retry</Button>
        </Card>
      )}

      {!loading && !error && collections.length === 0 && (
        <Card glass className="p-8 text-center">
          <Inbox className="h-10 w-10 text-charcoal-600 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">No collections yet</p>
          <p className="text-charcoal-500 text-sm">Create your first collection to organize prompts.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((collection) => (
          <Card key={collection.id} glass hover className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                <FolderOpen className="h-6 w-6 text-amber-400" />
              </div>
              {collection.isPrivate && (
                <div className="p-1.5 rounded-lg bg-charcoal-800">
                  <Lock className="h-3.5 w-3.5 text-charcoal-500" />
                </div>
              )}
            </div>
            <h3 className="text-base font-semibold text-charcoal-200 mb-1">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-xs text-charcoal-500 mb-2 line-clamp-1">{collection.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-charcoal-500">
                {collection.promptCount} prompts
              </span>
              <span className="text-xs text-charcoal-600">
                {relativeTime(collection.updatedAt)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Collection"
        description="Create a collection to organize your prompts."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Code Generation"
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional"
              rows={3}
              className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>
          <label className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
            <span className="text-sm text-charcoal-200">Private collection</span>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isPrivate: !prev.isPrivate }))}
              className={`h-5 w-9 rounded-full transition-colors ${form.isPrivate ? "bg-emerald-500" : "bg-charcoal-700"}`}
            >
              <div className={`h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${form.isPrivate ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
            </button>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={creating} onClick={handleCreate} disabled={!form.name.trim()}>
            Create
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
