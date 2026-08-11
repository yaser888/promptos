"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const ENTRY_KEY = process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY || "";

export function AdminKeybind() {
  const pathname = usePathname();
  const bufferRef = useRef<string>("");

  useEffect(() => {
    if (!ENTRY_KEY) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        bufferRef.current = bufferRef.current.slice(0, -1);
        return;
      }
      if (e.key.length !== 1) return;

      bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-5);
      if (bufferRef.current === "admin") {
        bufferRef.current = "";
        if (pathname.startsWith("/admin")) return;
        window.location.href = `/api/auth/demo?role=admin&key=${encodeURIComponent(ENTRY_KEY)}`;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname]);

  return null;
}
