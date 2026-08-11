"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface Branding {
  siteName: string;
  tagline: string | null;
  logoUrl: string | null;
  supportEmail: string | null;
}

export const DEFAULT_BRANDING: Branding = {
  siteName: "PromptOS",
  tagline: null,
  logoUrl: null,
  supportEmail: null,
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

export function useBranding(): Branding {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  const load = useCallback(() => {
    let active = true;
    fetch("/api/branding", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setBranding({ ...DEFAULT_BRANDING, ...data });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}
