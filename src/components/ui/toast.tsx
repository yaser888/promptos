"use client";

import { cn } from "@/utils/cn";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastVariant = "default" | "success" | "error" | "warning";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (props: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  default: "border-charcoal-700",
  success: "border-emerald-500/30",
  error: "border-red-500/30",
  warning: "border-amber-500/30",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-5 w-5 text-charcoal-400" />,
  success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
};

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((props: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title: props.title, description: props.description, variant: props.variant ?? "default" }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 end-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-charcoal-900/80 backdrop-blur-xl px-4 py-3 shadow-lg animate-slide-up min-w-[300px] max-w-[420px]",
        variantStyles[toast.variant]
      )}
    >
      <div className="mt-0.5 shrink-0">{variantIcons[toast.variant]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-charcoal-100">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-charcoal-400 mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded-lg p-0.5 text-charcoal-500 hover:text-charcoal-100 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

ToastProvider.displayName = "ToastProvider";

export { ToastProvider, useToast };
