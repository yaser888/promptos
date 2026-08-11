"use client";

import { cn } from "@/utils/cn";
import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: StatsCardProps) {
  return (
    <Card glass hover className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
          <Icon className="h-5 w-5 text-emerald-400" />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              changeType === "positive" &&
                "bg-emerald-500/10 text-emerald-400",
              changeType === "negative" && "bg-red-500/10 text-red-400",
              changeType === "neutral" && "bg-charcoal-800 text-charcoal-400"
            )}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-charcoal-100">{value}</p>
      <p className="text-sm text-charcoal-500 mt-1">{title}</p>
      {description && (
        <p className="text-xs text-charcoal-600 mt-2">{description}</p>
      )}
    </Card>
  );
}
