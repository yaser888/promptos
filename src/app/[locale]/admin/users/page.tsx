"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Shield, Ban, Mail, RefreshCw, Loader2 } from "lucide-react";

interface Subscription {
  plan: string;
  status: string;
}

interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  subscription: Subscription | null;
}

interface ApiResponse {
  users: User[];
  total: number;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-charcoal-800/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-charcoal-800 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-charcoal-800 animate-pulse" />
            <div className="h-2.5 w-36 rounded bg-charcoal-800/60 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-14 rounded-full bg-charcoal-800 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 w-10 rounded bg-charcoal-800 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 rounded-full bg-charcoal-800 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 w-20 rounded bg-charcoal-800 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="h-7 w-7 rounded-lg bg-charcoal-800 animate-pulse" />
          <div className="h-7 w-7 rounded-lg bg-charcoal-800 animate-pulse" />
          <div className="h-7 w-7 rounded-lg bg-charcoal-800 animate-pulse" />
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const t = useTranslations("adminPages");
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);
      const data: ApiResponse = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const formatJoinedDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runAction = async (id: string, body: Record<string, unknown>, successMsg: string) => {
    setActionLoading(id);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(successMsg);
      await fetchUsers();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRole = (user: User) =>
    runAction(user.id, { role: user.role === "ADMIN" ? "USER" : "ADMIN" }, t("users.roleUpdated"));

  const banUser = async (user: User) => {
    setActionLoading(user.id);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("common.somethingWentWrong"));
      }
      setNotice(t("users.userRemoved"));
      await fetchUsers();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setActionLoading(null);
    }
  };

  const emailAll = () => {
    setNotice(t("users.emailNotice"));
  };

  const getPlanLabel = (subscription: Subscription | null) => {
    return subscription?.plan || t("overview.free");
  };

  const getStatusLabel = (subscription: Subscription | null): string => {
    if (subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIALING")) {
      return t("common.active");
    }
    return t("common.inactive");
  };

  const getBadgeVariant = (plan: string) => {
    if (plan === "Pro" || plan === "Team") return "emerald";
    return "default";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-100">{t("users.title")}</h1>
          <p className="text-charcoal-500 mt-1">{t("users.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={emailAll}>
            <Mail className="h-4 w-4" />
            {t("users.emailAll")}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
          <input
            placeholder={t("users.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 ps-10 pr-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      <Card glass className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-800/50">
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("users.colUser")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("users.colPlan")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("users.colPrompts")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("users.colStatus")}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-charcoal-500 uppercase">{t("users.colJoined")}</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-red-400">{error}</p>
                      <Button variant="secondary" size="sm" onClick={fetchUsers}>
                        <RefreshCw className="h-4 w-4 mr-1.5" />
                        {t("common.tryAgain")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-charcoal-500">
                    {t("users.noUsers")}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const plan = getPlanLabel(user.subscription);
                  const status = getStatusLabel(user.subscription);
                  return (
                    <tr key={user.id} className="border-b border-charcoal-800/30 hover:bg-charcoal-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-800 text-xs text-charcoal-400">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-charcoal-200">{user.name}</p>
                            <p className="text-xs text-charcoal-600">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getBadgeVariant(plan)} size="sm">
                          {plan}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-charcoal-400">{total}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          status === "Active" ? "bg-emerald-500/10 text-emerald-400" : "bg-charcoal-800 text-charcoal-500"
                        }`}>{status}</span>
                      </td>
                      <td className="px-4 py-3 text-charcoal-500">{formatJoinedDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleRole(user)}
                            disabled={actionLoading === user.id}
                            className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                            title={user.role === "ADMIN" ? t("common.demoteToUser") : t("common.promoteToAdmin")}
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Shield className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => banUser(user)}
                            disabled={actionLoading === user.id}
                            className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-charcoal-800 transition-all disabled:opacity-50"
                            title={t("common.removeUser")}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                          <button className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all" title={t("common.moreActionsSoon")}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
