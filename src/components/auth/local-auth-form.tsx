"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Mail, User as UserIcon } from "lucide-react";

export function LocalAuthForm({ mode }: { mode: "signin" | "signup" }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  useEffect(() => {
    setError("");
  }, [mode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(isSignup ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup ? { name, email, password } : { email, password }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || t("genericError"));
        setLoading(false);
        return;
      }
      const target = data?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
      router.push(target);
      router.refresh();
    } catch {
      setError(t("genericError"));
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-charcoal-800/50 bg-charcoal-900/50 backdrop-blur-xl shadow-2xl p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-charcoal-100">
          {isSignup ? t("signUp.title") : t("signIn.title")}
        </h1>
        <p className="text-sm text-charcoal-400 leading-relaxed">
          {isSignup ? t("signUp.subtitle") : t("signIn.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup && (
          <div className="space-y-1.5">
            <label htmlFor="local-name" className="block text-xs font-medium text-charcoal-300">
              {t("name")}
            </label>
            <div className="relative">
              <UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
              <input
                id="local-name"
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 py-2.5 ps-9 pe-3 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="local-email" className="block text-xs font-medium text-charcoal-300">
            {t("email")}
          </label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
            <input
              id="local-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 py-2.5 ps-9 pe-3 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="local-password" className="block text-xs font-medium text-charcoal-300">
            {t("password")}
          </label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500" />
            <input
              id="local-password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? t("passwordPlaceholderSignup") : t("passwordPlaceholder")}
              className="w-full rounded-lg border border-charcoal-700 bg-charcoal-900/50 py-2.5 ps-9 pe-3 text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none"
            />
          </div>
          {isSignup && (
            <p className="text-[11px] text-charcoal-500">{t("passwordHint")}</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("submitting")}
            </>
          ) : (
            (isSignup ? t("signUp.submit") : t("signIn.submit"))
          )}
        </button>
      </form>

      <div className="pt-2 border-t border-charcoal-800/50 text-center">
        <p className="text-xs text-charcoal-400">
          {isSignup ? t("signIn.prompt") : t("signUp.prompt")}{" "}
          <Link
            href={isSignup ? "/sign-in" : "/sign-up"}
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            {isSignup ? t("signIn.link") : t("signUp.link")}
          </Link>
        </p>
        <Link
          href="/"
          className="inline-block mt-3 text-xs text-charcoal-500 hover:text-charcoal-300 transition-colors"
        >
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}