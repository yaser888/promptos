"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { HomeContentData } from "@/engine/home/home.types";
import { HOME_DEFAULTS } from "@/engine/home/home.types";

export interface HomePageData {
  stats: Record<string, number>;
  content: HomeContentData;
  pages: { slug: string; title: string }[];
}

const EMPTY_STATS: Record<string, number> = {};

const HomeContext = createContext<HomePageData>({
  stats: EMPTY_STATS,
  content: HOME_DEFAULTS,
  pages: [],
});

export function useHomeContent(): HomePageData {
  return useContext(HomeContext);
}

export function HomeContentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<HomePageData>({
    stats: EMPTY_STATS,
    content: HOME_DEFAULTS,
    pages: [],
  });

  const load = useCallback(() => {
    let active = true;
    fetch("/api/home", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json) return;
        setData({
          stats: json.stats ?? EMPTY_STATS,
          content: json.content ?? HOME_DEFAULTS,
          pages: json.pages ?? [],
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  return <HomeContext.Provider value={data}>{children}</HomeContext.Provider>;
}
