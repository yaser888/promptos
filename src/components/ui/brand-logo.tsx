"use client";

import { PanelRightOpen } from "lucide-react";
import { useBranding } from "@/components/providers/branding-provider";
import { cn } from "@/utils/cn";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  sub?: string;
  className?: string;
}

const sizeMap = {
  sm: { box: "h-6 w-6 rounded-md", icon: "h-3.5 w-3.5", text: "text-base", sub: "text-[9px]" },
  md: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4", text: "text-lg", sub: "text-[10px]" },
  lg: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5", text: "text-xl", sub: "text-[11px]" },
};

export function BrandLogo({ size = "md", showText = true, sub, className }: BrandLogoProps) {
  const branding = useBranding();
  const s = sizeMap[size];
  const name = branding.siteName || "PromptOS";
  const isDefaultName = name === "PromptOS";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={name}
          className={cn(s.box, "object-contain shrink-0 bg-charcoal-900/40")}
        />
      ) : (
        <div
          className={cn(
            s.box,
            "shrink-0 flex items-center justify-center bg-emerald-500 transition-transform duration-300 group-hover:scale-110"
          )}
        >
          <PanelRightOpen className={cn(s.icon, "text-black")} />
        </div>
      )}
      {showText && (
        <div className="min-w-0">
          {isDefaultName ? (
            <span className={cn(s.text, "font-bold text-charcoal-100 block truncate")}>
              Prompt<span className="text-emerald-400">OS</span>
            </span>
          ) : (
            <span className={cn(s.text, "font-bold text-charcoal-100 block truncate")}>{name}</span>
          )}
          {sub && (
            <span className={cn(s.sub, "text-charcoal-500 uppercase tracking-wider block")}>{sub}</span>
          )}
        </div>
      )}
    </div>
  );
}
