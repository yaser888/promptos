"use client";

import { cn } from "@/utils/cn";
import { createContext, useContext, useState, useRef, useEffect } from "react";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

DropdownMenu.displayName = "DropdownMenu";

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function DropdownMenuTrigger({ className, asChild = false, children, ...props }: DropdownMenuTriggerProps) {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  if (asChild) {
    return (
      <div className="inline-flex" onClick={() => ctx.setOpen(!ctx.open)}>
        {children}
      </div>
    );
  }

  return (
    <button
      className={cn("inline-flex items-center justify-center", className)}
      onClick={() => ctx.setOpen(!ctx.open)}
      {...props}
    >
      {children}
    </button>
  );
}

DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end";
}

function DropdownMenuContent({ className, align = "start", children, ...props }: DropdownMenuContentProps) {
  const ctx = useContext(DropdownMenuContext);
  const ref = useRef<HTMLDivElement>(null);
  if (!ctx) throw new Error("DropdownMenuContent must be used within DropdownMenu");

  const { open, setOpen } = ctx;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 mt-1 min-w-[200px] animate-slide-up rounded-xl border border-charcoal-800/50 bg-charcoal-900/80 backdrop-blur-xl p-1 shadow-xl",
        align === "end" ? "end-0" : "start-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

function DropdownMenuItem({ className, icon, children, ...props }: DropdownMenuItemProps) {
  const ctx = useContext(DropdownMenuContext);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-charcoal-300 transition-colors hover:bg-charcoal-800 hover:text-charcoal-100",
        className
      )}
      onClick={(e) => {
        ctx?.setOpen(false);
        props.onClick?.(e);
      }}
      {...props}
    >
      {icon && <span className="h-4 w-4 shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

DropdownMenuItem.displayName = "DropdownMenuItem";

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("my-1 h-px bg-charcoal-800", className)}
      {...props}
    />
  );
}

DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator };
