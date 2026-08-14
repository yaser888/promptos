"use client";

import { Container } from "@/components/ui/container";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuthUser } from "@/components/providers/auth-provider";
import { BrandLogo } from "@/components/ui/brand-logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ArrowLeft } from "lucide-react";

export function AuthPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth");
  const { isSignedIn, isLoaded } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

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
        {children}
      </Container>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 text-sm text-charcoal-500 hover:text-charcoal-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToHome")}
      </Link>
    </div>
  );
}