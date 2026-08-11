"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Check, Languages } from "lucide-react";
import { defaultLocale, localeConfig } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";

interface EffectiveLocale {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  flag: string;
}

const BUILTIN_LOCALES: EffectiveLocale[] = Object.values(localeConfig);

export function LanguageSwitcher({ fullWidth = false }: { fullWidth?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [available, setAvailable] = useState<EffectiveLocale[]>(BUILTIN_LOCALES);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-languages")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const items = data?.languages as EffectiveLocale[] | undefined;
        if (Array.isArray(items) && items.length > 0) {
          setAvailable([...items].sort((a, b) => a.code.localeCompare(b.code)));
        }
      })
      .catch(() => {
        // keep builtin list
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const codes = available.map((l) => l.code);
  const codePattern = new RegExp(`^/(${codes.join("|")})(?=/|$)`);

  const fallbackLocale = (): string => {
    const m = pathname.match(codePattern);
    return m && codes.includes(m[1]) ? m[1] : defaultLocale;
  };

  const activeCode: string = codes.includes(locale) ? locale : fallbackLocale();
  const current = available.find((l) => l.code === activeCode) ?? available[0];

  const switchTo = (next: string) => {
    if (next === activeCode) return;
    const rest = pathname.replace(codePattern, "") || "/";
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.push(`/${next}${rest}${search}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex h-9 items-center gap-1.5 rounded-lg border border-charcoal-700/80 bg-charcoal-900/60 px-2.5 text-sm transition-all duration-200 hover:border-emerald-400/50 hover:bg-charcoal-800",
          fullWidth && "w-full justify-between"
        )}
      >
        <Languages className="h-4 w-4 shrink-0 text-charcoal-300 transition-colors group-hover:text-emerald-300" />
        <span className="text-sm leading-none">{current?.flag ?? ""}</span>
        <ChevronDown className="h-3 w-3 text-charcoal-500 transition-transform duration-200 group-hover:translate-y-px group-hover:text-emerald-300" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[320px] overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-500">
          Choose language
        </div>
        <DropdownMenuSeparator />
        {available.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchTo(l.code)}
            className={cn(
              "justify-between",
              l.code === activeCode && "bg-emerald-500/10 text-emerald-400"
            )}
          >
            <span className="flex items-center gap-2.5">
              <span className="text-base leading-none">{l.flag}</span>
              <span>{l.nativeName}</span>
            </span>
            {l.code === activeCode && <Check className="h-4 w-4 text-emerald-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}