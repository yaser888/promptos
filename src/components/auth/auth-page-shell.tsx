"use client";

import { Container } from "@/components/ui/container";
import { AlertCircle, ArrowLeft, ShieldCheck, User as UserIcon, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/components/providers/auth-provider";
import { BrandLogo } from "@/components/ui/brand-logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function AuthPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const clerkDisabled = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const { isSignedIn, user, isLoaded } = useAuthUser();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleDemoLogin = () => {
    setSigningIn(true);
    window.location.href = "/api/auth/demo?role=user";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface py-12 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <Link href="/" className="flex items-center mb-8 relative">
        <BrandLogo size="md" />
      </Link>
      <Container className="relative flex justify-center">
        {clerkDisabled ? (
          <div className="w-full max-w-md rounded-2xl border border-charcoal-800/50 bg-charcoal-900/50 backdrop-blur-xl shadow-2xl p-8 text-center space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 mx-auto">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-charcoal-100">
              {title === "Authentication is not configured" ? "Welcome to PromptOS" : title}
            </h1>
            <p className="text-sm text-charcoal-400 leading-relaxed">
              {description === "Clerk keys are missing. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to your .env.local file, or claim your keys at dashboard.clerk.com."
                ? "You're running in local demo mode. Sign in with a demo account to explore the full platform — every feature is backed by the live database."
                : description}
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleDemoLogin}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-charcoal-700 bg-charcoal-800/50 text-charcoal-200 text-sm font-medium hover:bg-charcoal-800 disabled:opacity-50 transition-all"
              >
                <UserIcon className="h-4 w-4" />
                {signingIn ? "Signing in..." : "Continue as User"}
              </button>
              {isSignedIn && (
                <button
                  onClick={() => router.push("/api/auth/demo?role=signout")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-charcoal-500 hover:text-charcoal-300 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out of demo session
                </button>
              )}
            </div>

            <div className="pt-3 border-t border-charcoal-800/50 space-y-2">
              <p className="text-[11px] text-charcoal-600 leading-relaxed">
                Demo accounts are seeded from the database. Sign in as a member to explore the platform.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-charcoal-400 hover:text-charcoal-200 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </Container>
    </div>
  );
}
