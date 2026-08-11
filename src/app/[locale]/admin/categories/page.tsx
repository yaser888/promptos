"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { FolderTree, Plus, Edit2, Trash2, Search, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  _count: { prompts: number };
}

const colorOptions = [
  { value: "emerald", label: "Emerald" },
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
  { value: "purple", label: "Purple" },
  { value: "red", label: "Red" },
  { value: "pink", label: "Pink" },
  { value: "indigo", label: "Indigo" },
  { value: "teal", label: "Teal" },
];

const iconBgColors: Record<string, string> = {
  emerald: "bg-emerald-500/10", blue: "bg-blue-500/10", amber: "bg-amber-500/10",
  purple: "bg-purple-500/10", red: "bg-red-500/10", pink: "bg-pink-500/10",
  indigo: "bg-indigo-500/10", teal: "bg-teal-500/10",
};

const iconTextColors: Record<string, string> = {
  emerald: "text-emerald-400", blue: "text-blue-400", amber: "text-amber-400",
  purple: "text-purple-400", red: "text-red-400", pink: "text-pink-400",
  indigo: "text-indigo-400", teal: "text-teal-400",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AdminCategoriesPage() {
  const t = useTranslations("adminPages");
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", slug: "", description: "", color: "emerald" });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", slug: "", description: "", color: "emerald" });
  const [editSlugManuallyEdited, setEditSlugManuallyEdited] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited && createForm.name) {
      setCreateForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [createForm.name, slugManuallyEdited]);

  useEffect(() => {
    if (!editSlugManuallyEdited && editForm.name) {
      setEditForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [editForm.name, editSlugManuallyEdited]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.anErrorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          slug: createForm.slug || generateSlug(createForm.name),
          description: createForm.description || null,
          color: createForm.color,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t("common.somethingWentWrong"));
      }
      toast({ title: t("categories.created"), variant: "success" });
      setCreateOpen(false);
      setCreateForm({ name: "", slug: "", description: "", color: "emerald" });
      setSlugManuallyEdited(false);
      fetchCategories();
    } catch (err) {
      toast({
        title: t("common.anErrorOccurred"),
        description: err instanceof Error ? err.message : t("common.somethingWentWrong"),
        variant: "error",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditForm({ id: cat.id, name: cat.name, slug: cat.slug, description: cat.description ?? "", color: cat.color });
    setEditSlugManuallyEdited(true);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || !editForm.id) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug || generateSlug(editForm.name),
          description: editForm.description || null,
          color: editForm.color,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t("common.somethingWentWrong"));
      }
      toast({ title: t("categories.updated"), variant: "success" });
      setEditOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      toast({
        title: t("common.anErrorOccurred"),
        description: err instanceof Error ? err.message : t("common.somethingWentWrong"),
        variant: "error",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const openDelete = (cat: Category) => {
    setDeletingCategory(cat);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t("common.somethingWentWrong"));
      }
      toast({
        title: t("categories.deleted"),
        description: t("categories.deletedDesc", { name: deletingCategory.name }),
        variant: "success",
      });
      setDeleteOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err) {
      toast({
        title: t("common.anErrorOccurred"),
        description: err instanceof Error ? err.message : t("common.somethingWentWrong"),
        variant: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("categories.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("categories.subtitle")}</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("categories.addCategory")}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("categories.search")}
          className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchCategories}>
            {t("common.tryAgain")}
          </Button>
        </div>
      )}

      {!loading && !error && filteredCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderTree className="h-12 w-12 text-charcoal-700 mb-3" />
          <p className="text-charcoal-500 text-sm">
            {searchQuery ? t("categories.noCategoriesMatch") : t("categories.noCategories")}
          </p>
        </div>
      )}

      {!loading && !error && filteredCategories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => (
            <Card key={cat.id} glass hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    iconBgColors[cat.color] || "bg-charcoal-500/10"
                  )}
                >
                  <FolderTree
                    className={cn(
                      "h-5 w-5",
                      iconTextColors[cat.color] || "text-charcoal-400"
                    )}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openDelete(cat)}
                    className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-charcoal-200">{cat.name}</h3>
              <p className="text-xs text-charcoal-600 mt-0.5">/{cat.slug}</p>
              {cat.description && (
                <p className="text-xs text-charcoal-500 mt-1.5 line-clamp-2">{cat.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-charcoal-800/50">
                <Badge variant="default" size="sm">{t("categories.promptsCount", { count: cat._count.prompts })}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("categories.createTitle")}
        description={t("categories.createDesc")}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.name")} *</label>
            <input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("categories.categoryName")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.slug")}</label>
            <input
              value={createForm.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setCreateForm((prev) => ({ ...prev, slug: e.target.value }));
              }}
              placeholder={t("common.autoGenerated")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.description")}</label>
            <textarea
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t("categories.optionalDescription")}
              rows={3}
              className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.color")}</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    setCreateForm((prev) => ({ ...prev, color: c.value }))
                  }
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all",
                    createForm.color === c.value
                      ? "border-charcoal-500 bg-charcoal-800 ring-2 ring-emerald-500/30"
                      : "border-charcoal-700 bg-charcoal-900/50 hover:bg-charcoal-800"
                  )}
                >
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full",
                      `bg-${c.value}-500`
                    )}
                  />
                  {t(`categories.color${c.value.charAt(0).toUpperCase()}${c.value.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            loading={createLoading}
            onClick={handleCreate}
            disabled={!createForm.name.trim()}
          >
            {t("common.save")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("categories.editTitle")}
        description={t("categories.editDesc")}
      >
        {editingCategory && (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("common.name")} *</label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("categories.categoryName")}
                  className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("common.slug")}</label>
                <input
                  value={editForm.slug}
                  onChange={(e) => {
                    setEditSlugManuallyEdited(true);
                    setEditForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  placeholder={t("common.autoGenerated")}
                  className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("common.description")}</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t("categories.optionalDescription")}
                  rows={3}
                  className="flex w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-charcoal-200">{t("common.color")}</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() =>
                        setEditForm((prev) => ({ ...prev, color: c.value }))
                      }
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all",
                        editForm.color === c.value
                          ? "border-charcoal-500 bg-charcoal-800 ring-2 ring-emerald-500/30"
                          : "border-charcoal-700 bg-charcoal-900/50 hover:bg-charcoal-800"
                      )}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full",
                          `bg-${c.value}-500`
                        )}
                      />
                      {t(`categories.color${c.value.charAt(0).toUpperCase()}${c.value.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                loading={editLoading}
                onClick={handleEdit}
                disabled={!editForm.name.trim()}
              >
                {t("common.update")}
              </Button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("categories.deleteTitle")}
        description={
          deletingCategory
            ? t("categories.deleteDesc", { name: deletingCategory.name })
            : ""
        }
        size="sm"
      >
        {deletingCategory && (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
