"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Inbox, Crown, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/utils/cn";

interface PlanFeature {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: number;
  period: string;
  stripePriceId: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  features: PlanFeature[];
  subscribers: number;
}

interface PlanForm {
  key: string;
  name: string;
  description: string;
  price: string;
  period: string;
  stripePriceId: string;
  sortOrder: string;
  isActive: boolean;
  isDefault: boolean;
  features: string[];
}

const PERIODS = ["monthly", "yearly", "one_time", "custom"];

const emptyForm: PlanForm = {
  key: "",
  name: "",
  description: "",
  price: "0",
  period: "monthly",
  stripePriceId: "",
  sortOrder: "0",
  isActive: true,
  isDefault: false,
  features: [],
};

function toForm(plan: Plan): PlanForm {
  return {
    key: plan.key,
    name: plan.name,
    description: plan.description || "",
    price: String(plan.price),
    period: plan.period,
    stripePriceId: plan.stripePriceId || "",
    sortOrder: String(plan.sortOrder),
    isActive: plan.isActive,
    isDefault: plan.isDefault,
    features: plan.features.map((f) => f.name),
  };
}

export default function AdminPlansPage() {
  const t = useTranslations("adminPages");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<PlanForm>(emptyForm);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState<PlanForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Plan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/plans");
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const setField = (
    setter: (fn: (prev: PlanForm) => PlanForm) => void,
    key: keyof PlanForm,
    value: any
  ) => setter((prev) => ({ ...prev, [key]: value }));

  const setFeature = (
    setter: (fn: (prev: PlanForm) => PlanForm) => void,
    index: number,
    value: string
  ) =>
    setter((prev) => {
      const features = [...prev.features];
      features[index] = value;
      return { ...prev, features };
    });

  const addFeature = (setter: (fn: (prev: PlanForm) => PlanForm) => void) =>
    setter((prev) => ({ ...prev, features: [...prev.features, ""] }));

  const removeFeature = (setter: (fn: (prev: PlanForm) => PlanForm) => void, index: number) =>
    setter((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.key.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: createForm.key,
          name: createForm.name,
          description: createForm.description || null,
          price: parseFloat(createForm.price) || 0,
          period: createForm.period,
          stripePriceId: createForm.stripePriceId || null,
          sortOrder: parseInt(createForm.sortOrder) || 0,
          isActive: createForm.isActive,
          isDefault: createForm.isDefault,
          features: createForm.features.filter((f) => f.trim()),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("plans.created", { name: createForm.name }));
      setCreateOpen(false);
      setCreateForm(emptyForm);
      fetchPlans();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (plan: Plan) => {
    setEditTarget(plan);
    setEditForm(toForm(plan));
  };

  const handleEdit = async () => {
    if (!editTarget || !editForm.name.trim()) return;
    setEditLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/plans/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editForm.key,
          name: editForm.name,
          description: editForm.description || null,
          price: parseFloat(editForm.price) || 0,
          period: editForm.period,
          stripePriceId: editForm.stripePriceId || null,
          sortOrder: parseInt(editForm.sortOrder) || 0,
          isActive: editForm.isActive,
          isDefault: editForm.isDefault,
          features: editForm.features.filter((f) => f.trim()),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("plans.updated", { name: editForm.name }));
      setEditTarget(null);
      fetchPlans();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/plans/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("plans.deleted", { name: deleteConfirm.name }));
      setDeleteConfirm(null);
      fetchPlans();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const periodLabel = (p: string) =>
    p === "monthly" ? t("plans.perMonth") : p === "yearly" ? t("plans.perYear") : p === "one_time" ? t("plans.oneTime") : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("plans.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("plans.subtitle")}</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("plans.addPlan")}
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
          <Button variant="secondary" onClick={fetchPlans}>{t("common.tryAgain")}</Button>
        </Card>
      )}

      {!loading && !error && plans.length === 0 && (
        <Card glass className="p-8 text-center">
          <Inbox className="h-10 w-10 text-charcoal-600 mx-auto mb-3" />
          <p className="text-charcoal-400 text-lg font-medium mb-1">{t("plans.noPlans")}</p>
          <p className="text-charcoal-500 text-sm">{t("plans.noPlansHint")}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isExpanded = expanded.has(plan.id);
          return (
            <Card key={plan.id} glass hover className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Crown className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal-100 flex items-center gap-2">
                      {plan.name}
                      {plan.isDefault && <Badge variant="emerald" size="sm">{t("common.default")}</Badge>}
                    </h3>
                    <p className="text-xs text-charcoal-600 font-mono">{plan.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-1.5 rounded-lg text-charcoal-500 hover:text-emerald-400 hover:bg-charcoal-800 transition-all"
                    title={t("plans.editPlan")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(plan)}
                    className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all"
                    title={t("plans.deletePlanTitle")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-3xl font-bold text-charcoal-100">
                  ${plan.price > 0 ? plan.price : 0}
                </span>
                <span className="text-sm text-charcoal-500 pb-1">{periodLabel(plan.period)}</span>
              </div>
              {plan.description && (
                <p className="text-xs text-charcoal-500 mb-3 line-clamp-2">{plan.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mb-4 mt-auto">
                <Badge variant={plan.isActive ? "emerald" : "default"} size="sm">
                  {plan.isActive ? t("common.active") : t("common.inactive")}
                </Badge>
                <Badge variant="outline" size="sm">{plan.period}</Badge>
                <span className="text-xs text-charcoal-500 ms-auto">
                  {plan.subscribers === 1
                    ? t("plans.subscribers", { count: plan.subscribers })
                    : t("plans.subscribersPlural", { count: plan.subscribers })}
                </span>
              </div>

              <div className="border-t border-charcoal-800/50 pt-3">
                <button
                  onClick={() => toggleExpand(plan.id)}
                  className="flex items-center justify-between w-full text-xs font-medium text-charcoal-400 hover:text-charcoal-200 transition-colors"
                >
                  <span>{t("plans.featuresCount", { count: plan.features.length })}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f.id} className="flex items-start gap-2 text-sm text-charcoal-400">
                        <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="font-mono text-xs break-all">{f.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("plans.addTitle")}
        description={t("plans.addDesc")}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("plans.key")}</label>
              <input
                value={createForm.key}
                onChange={(e) => setField(setCreateForm, "key", e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                placeholder={t("plans.keyPlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.name")} *</label>
              <input
                value={createForm.name}
                onChange={(e) => setField(setCreateForm, "name", e.target.value)}
                placeholder={t("plans.namePlaceholder")}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.description")}</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setField(setCreateForm, "description", e.target.value)}
              placeholder={t("plans.descriptionPlaceholder")}
              rows={2}
              className="w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.price")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.price}
                onChange={(e) => setField(setCreateForm, "price", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.period")}</label>
              <select
                value={createForm.period}
                onChange={(e) => setField(setCreateForm, "period", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("plans.sortOrder")}</label>
              <input
                type="number"
                value={createForm.sortOrder}
                onChange={(e) => setField(setCreateForm, "sortOrder", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("plans.stripePriceId")}</label>
            <input
              value={createForm.stripePriceId}
              onChange={(e) => setField(setCreateForm, "stripePriceId", e.target.value)}
              placeholder={t("plans.stripePlaceholder")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
              <span className="text-sm text-charcoal-200">{t("plans.planActive")}</span>
              <button
                type="button"
                onClick={() => setField(setCreateForm, "isActive", !createForm.isActive)}
                className={cn("h-5 w-9 rounded-full transition-colors", createForm.isActive ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", createForm.isActive ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
              <span className="text-sm text-charcoal-200">{t("plans.defaultPlan")}</span>
              <button
                type="button"
                onClick={() => setField(setCreateForm, "isDefault", !createForm.isDefault)}
                className={cn("h-5 w-9 rounded-full transition-colors", createForm.isDefault ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", createForm.isDefault ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-charcoal-200">{t("common.features")}</label>
              <Button variant="secondary" size="sm" onClick={() => addFeature(setCreateForm)}>
                <Plus className="h-3.5 w-3.5" />
                {t("plans.addFeature")}
              </Button>
            </div>
            {createForm.features.length === 0 && (
              <p className="text-xs text-charcoal-600">{t("plans.noFeatures")}</p>
            )}
            {createForm.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={f}
                  onChange={(e) => setFeature(setCreateForm, i, e.target.value)}
                  placeholder={t("plans.featurePlaceholder", { n: i + 1 })}
                  className="flex h-9 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                />
                <button
                  onClick={() => removeFeature(setCreateForm, i)}
                  className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all shrink-0"
                  title={t("plans.removeFeature")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="primary" loading={createLoading} onClick={handleCreate} disabled={!createForm.name.trim() || !createForm.key.trim()}>
            {t("common.save")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={t("plans.editTitle")}
        description={t("plans.editDesc", { name: editTarget?.name || "" })}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("plans.key")}</label>
              <input
                value={editForm.key}
                onChange={(e) => setField(setEditForm, "key", e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.name")} *</label>
              <input
                value={editForm.name}
                onChange={(e) => setField(setEditForm, "name", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("common.description")}</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setField(setEditForm, "description", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.price")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setField(setEditForm, "price", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("common.period")}</label>
              <select
                value={editForm.period}
                onChange={(e) => setField(setEditForm, "period", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-charcoal-200">{t("plans.sortOrder")}</label>
              <input
                type="number"
                value={editForm.sortOrder}
                onChange={(e) => setField(setEditForm, "sortOrder", e.target.value)}
                className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-200">{t("plans.stripePriceId")}</label>
            <input
              value={editForm.stripePriceId}
              onChange={(e) => setField(setEditForm, "stripePriceId", e.target.value)}
              placeholder={t("plans.stripePlaceholder")}
              className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
              <span className="text-sm text-charcoal-200">{t("plans.planActive")}</span>
              <button
                type="button"
                onClick={() => setField(setEditForm, "isActive", !editForm.isActive)}
                className={cn("h-5 w-9 rounded-full transition-colors", editForm.isActive ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", editForm.isActive ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg bg-charcoal-800/30 cursor-pointer">
              <span className="text-sm text-charcoal-200">{t("plans.defaultPlan")}</span>
              <button
                type="button"
                onClick={() => setField(setEditForm, "isDefault", !editForm.isDefault)}
                className={cn("h-5 w-9 rounded-full transition-colors", editForm.isDefault ? "bg-emerald-500" : "bg-charcoal-700")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform mt-0.5", editForm.isDefault ? "translate-x-[18px]" : "translate-x-[2px]")} />
              </button>
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-charcoal-200">{t("common.features")}</label>
              <Button variant="secondary" size="sm" onClick={() => addFeature(setEditForm)}>
                <Plus className="h-3.5 w-3.5" />
                {t("plans.addFeature")}
              </Button>
            </div>
            {editForm.features.length === 0 && (
              <p className="text-xs text-charcoal-600">{t("plans.noFeatures")}</p>
            )}
            {editForm.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={f}
                  onChange={(e) => setFeature(setEditForm, i, e.target.value)}
                  placeholder={t("plans.featureEditPlaceholder", { n: i + 1 })}
                  className="flex h-9 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                />
                <button
                  onClick={() => removeFeature(setEditForm, i)}
                  className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all shrink-0"
                  title={t("plans.removeFeature")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setEditTarget(null)}>{t("common.cancel")}</Button>
          <Button variant="primary" loading={editLoading} onClick={handleEdit} disabled={!editForm.name.trim()}>
            {t("common.saveChanges")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("plans.deleteDialog")}
        description={t("plans.deleteDesc", { name: deleteConfirm?.name || "" })}
      >
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/50">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>{t("common.cancel")}</Button>
          <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            {t("plans.deleteBtn")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
