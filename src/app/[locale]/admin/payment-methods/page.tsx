"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Wallet,
  Settings2,
  Check,
  X,
  KeyRound,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  config: Record<string, string>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ConfigRow {
  key: string;
  value: string;
}

interface MethodForm {
  name: string;
  code: string;
  description: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
  config: ConfigRow[];
}

const emptyForm: MethodForm = {
  name: "",
  code: "",
  description: "",
  icon: "",
  sortOrder: "0",
  isActive: true,
  config: [{ key: "", value: "" }],
};

function toForm(method: PaymentMethod): MethodForm {
  const rows: ConfigRow[] = Object.entries(method.config || {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
  if (rows.length === 0) rows.push({ key: "", value: "" });
  return {
    name: method.name,
    code: method.code,
    description: method.description || "",
    icon: method.icon || "",
    sortOrder: String(method.sortOrder),
    isActive: method.isActive,
    config: rows,
  };
}

function formToMethod(form: MethodForm) {
  const config: Record<string, string> = {};
  for (const row of form.config) {
    const key = row.key.trim();
    if (key) config[key] = row.value;
  }
  return {
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim() || undefined,
    icon: form.icon.trim() || undefined,
    sortOrder: parseInt(form.sortOrder || "0") || 0,
    isActive: form.isActive,
    config,
  };
}

const ICON_OPTIONS = ["💳", "🅿️", "🏦", "💵", "🪙", "💰", "🔄", "📲", "🏧", "🅰️", "🔷", "🌍"];

export default function AdminPaymentMethodsPage() {
  const t = useTranslations("adminPages");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<MethodForm>(emptyForm);
  const [editTarget, setEditTarget] = useState<PaymentMethod | null>(null);
  const [editForm, setEditForm] = useState<MethodForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentMethod | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payment-methods");
      if (!res.ok) throw new Error(t("common.somethingWentWrong"));
      const data = await res.json();
      setMethods(data.methods ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const setFormField = (
    setter: (fn: (prev: MethodForm) => MethodForm) => void,
    key: keyof MethodForm,
    value: any
  ) => setter((prev) => ({ ...prev, [key]: value }));

  const setConfigRow = (
    setter: (fn: (prev: MethodForm) => MethodForm) => void,
    index: number,
    field: keyof ConfigRow,
    value: string
  ) =>
    setter((prev) => ({
      ...prev,
      config: prev.config.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));

  const addConfigRow = (setter: (fn: (prev: MethodForm) => MethodForm) => void) =>
    setter((prev) => ({ ...prev, config: [...prev.config, { key: "", value: "" }] }));

  const removeConfigRow = (setter: (fn: (prev: MethodForm) => MethodForm) => void, index: number) =>
    setter((prev) => ({
      ...prev,
      config: prev.config.length > 1 ? prev.config.filter((_, i) => i !== index) : prev.config,
    }));

  const handleCreate = async () => {
    setCreateLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToMethod(createForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setNotice(t("paymentMethods.created", { name: data.method.name }));
      setCreateOpen(false);
      setCreateForm(emptyForm);
      fetchMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (method: PaymentMethod) => {
    setEditTarget(method);
    setEditForm(toForm(method));
    setError(null);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payment-methods/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToMethod(editForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.somethingWentWrong"));
      setNotice(t("paymentMethods.updated", { name: data.method.name }));
      setEditTarget(null);
      fetchMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payment-methods/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t("common.somethingWentWrong"));
      }
      setNotice(t("paymentMethods.deleted", { name: deleteConfirm.name }));
      setDeleteConfirm(null);
      fetchMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggle = async (method: PaymentMethod) => {
    setTogglingId(method.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payment-methods/${method.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !method.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t("common.somethingWentWrong"));
      }
      fetchMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setTogglingId(null);
    }
  };

  const renderConfigEditor = (
    form: MethodForm,
    setter: (fn: (prev: MethodForm) => MethodForm) => void
  ) => (
    <div className="space-y-2">
      <p className="text-xs text-charcoal-400">{t("paymentMethods.configHint")}</p>
      {form.config.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={row.key}
            onChange={(e) => setConfigRow(setter, i, "key", e.target.value)}
            placeholder={t("paymentMethods.fieldName")}
            className="flex-1 rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 outline-none focus:border-emerald-500/50"
          />
          <input
            value={row.value}
            onChange={(e) => setConfigRow(setter, i, "value", e.target.value)}
            placeholder={t("paymentMethods.value")}
            className="flex-1 rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 outline-none focus:border-emerald-500/50"
          />
          <button
            type="button"
            onClick={() => removeConfigRow(setter, i)}
            className="p-2 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title={t("paymentMethods.removeField")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => addConfigRow(setter)}>
        <Plus className="h-3.5 w-3.5" /> {t("paymentMethods.addField")}
      </Button>
    </div>
  );

  const renderIconPicker = (
    value: string,
    onChange: (v: string) => void
  ) => (
    <div className="flex flex-wrap gap-1.5">
      {ICON_OPTIONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(value === icon ? "" : icon)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all",
            value === icon
              ? "border-emerald-500/60 bg-emerald-500/15"
              : "border-charcoal-800 bg-charcoal-900/60 hover:border-charcoal-700"
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );

  const renderFormFields = (
    form: MethodForm,
    setter: (fn: (prev: MethodForm) => MethodForm) => void,
    isEdit: boolean
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal-400">{t("paymentMethods.name")}</label>
          <input
            value={form.name}
            onChange={(e) => setFormField(setter, "name", e.target.value)}
            placeholder={t("paymentMethods.namePlaceholder")}
            className="w-full rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal-400">{t("paymentMethods.code")}</label>
          <input
            value={form.code}
            onChange={(e) => setFormField(setter, "code", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
            placeholder={t("paymentMethods.codePlaceholder")}
            className="w-full rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-charcoal-400">{t("common.description")}</label>
        <input
          value={form.description}
          onChange={(e) => setFormField(setter, "description", e.target.value)}
          placeholder={t("paymentMethods.descPlaceholder")}
          className="w-full rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 outline-none focus:border-emerald-500/50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-charcoal-400">{t("paymentMethods.icon")}</label>
        {renderIconPicker(form.icon, (v) => setFormField(setter, "icon", v))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal-400">{t("paymentMethods.sortOrder")}</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setFormField(setter, "sortOrder", e.target.value)}
            className="w-full rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-3 py-2 text-sm text-charcoal-100 outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal-400">{t("paymentMethods.status")}</label>
          <button
            type="button"
            onClick={() => setFormField(setter, "isActive", !form.isActive)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
              form.isActive
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-charcoal-800 bg-charcoal-900/60 text-charcoal-500"
            )}
          >
            <span className="flex items-center gap-2">
              {form.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {form.isActive ? t("common.active") : t("common.inactive")}
            </span>
          </button>
        </div>
      </div>
      <div className="border-t border-charcoal-800/50 pt-4">{renderConfigEditor(form, setter)}</div>
      {isEdit && form.code && (
        <p className="text-[11px] text-charcoal-600">{t("paymentMethods.privateHint")}</p>
      )}
    </div>
  );

  const activeCount = methods.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("paymentMethods.title")}</h1>
          <p className="text-sm text-charcoal-500 mt-1">
            {t("paymentMethods.subtitle")}
          </p>
        </div>
        <Button variant="primary" onClick={() => { setCreateForm(emptyForm); setCreateOpen(true); setError(null); }}>
          <Plus className="h-4 w-4" /> {t("paymentMethods.addMethod")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card glass className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-charcoal-800/60">
              <Wallet className="h-5 w-5 text-charcoal-300" />
            </span>
          </div>
          <p className="text-2xl font-bold text-charcoal-100">{methods.length}</p>
          <p className="text-xs text-charcoal-500 mt-1">{t("paymentMethods.totalMethods")}</p>
        </Card>
        <Card glass className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Check className="h-5 w-5 text-emerald-400" />
            </span>
          </div>
          <p className="text-2xl font-bold text-charcoal-100">{activeCount}</p>
          <p className="text-xs text-charcoal-500 mt-1">{t("paymentMethods.activeMethods")}</p>
        </Card>
        <Card glass className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-charcoal-800/60">
              <Settings2 className="h-5 w-5 text-charcoal-300" />
            </span>
          </div>
          <p className="text-2xl font-bold text-charcoal-100">
            {methods.reduce((sum, m) => sum + Object.keys(m.config || {}).length, 0)}
          </p>
          <p className="text-xs text-charcoal-500 mt-1">{t("paymentMethods.configuredFields")}</p>
        </Card>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-400">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-emerald-500/70 hover:text-emerald-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ms-auto text-red-500/70 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card glass>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-800/60 text-start text-xs text-charcoal-500">
                <th className="px-4 py-3 font-medium">{t("paymentMethods.colMethod")}</th>
                <th className="px-4 py-3 font-medium">{t("paymentMethods.colCode")}</th>
                <th className="hidden md:table-cell px-4 py-3 font-medium">{t("paymentMethods.colDescription")}</th>
                <th className="hidden lg:table-cell px-4 py-3 font-medium">{t("paymentMethods.colConfig")}</th>
                <th className="px-4 py-3 font-medium">{t("paymentMethods.colStatus")}</th>
                <th className="px-4 py-3 font-medium text-end">{t("paymentMethods.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-charcoal-500" />
                    </div>
                  </td>
                </tr>
              ) : methods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-charcoal-500">
                    {t("paymentMethods.noMethods")}
                  </td>
                </tr>
              ) : (
                methods.map((method) => (
                  <tr key={method.id} className="border-b border-charcoal-800/40 last:border-0 hover:bg-charcoal-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-charcoal-800/60 text-lg">
                          {method.icon || "💳"}
                        </span>
                        <div>
                          <p className="font-medium text-charcoal-100">{method.name}</p>
                          <p className="text-xs text-charcoal-600">{method.sortOrder}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-charcoal-800/60 px-2 py-1 text-xs text-emerald-400">{method.code}</code>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-charcoal-400 max-w-[280px]">
                      <span className="line-clamp-2">{method.description || "—"}</span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-400">
                        <KeyRound className="h-3.5 w-3.5" />
                        {Object.keys(method.config || {}).length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(method)}
                        disabled={togglingId === method.id}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all disabled:opacity-50",
                          method.isActive
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-charcoal-800/60 text-charcoal-500 hover:bg-charcoal-800"
                        )}
                      >
                        {togglingId === method.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className={cn("h-1.5 w-1.5 rounded-full", method.isActive ? "bg-emerald-400" : "bg-charcoal-600")} />
                        )}
                        {method.isActive ? t("common.active") : t("common.inactive")}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(method)}
                          className="p-2 rounded-lg text-charcoal-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title={t("paymentMethods.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteConfirm(method); setError(null); }}
                          className="p-2 rounded-lg text-charcoal-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={t("paymentMethods.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("paymentMethods.addTitle")}
        description={t("paymentMethods.addDesc")}
        size="lg"
      >
        {renderFormFields(createForm, setCreateForm, false)}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={createLoading}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={createLoading || !createForm.name.trim() || !createForm.code.trim()}>
            {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("paymentMethods.create")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={t("paymentMethods.editTitle", { name: editTarget?.name || "" })}
        description={t("paymentMethods.editDesc")}
        size="lg"
      >
        {editTarget && renderFormFields(editForm, setEditForm, true)}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={editLoading}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleEdit} disabled={editLoading || !editForm.name.trim() || !editForm.code.trim()}>
            {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("common.saveChanges")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("paymentMethods.deleteTitle")}
        description={t("paymentMethods.deleteDesc")}
        size="sm"
      >
        <p className="text-sm text-charcoal-400">
          {t("paymentMethods.deleteConfirm", { name: deleteConfirm?.name || "" })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t("paymentMethods.delete")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
