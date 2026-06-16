/**
 * AdminStatStrip — compact summary stats row for the top of admin list pages.
 * Responsive: 2 cols on mobile, up to N on desktop.
 */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminStat {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  hint?: string;
}

const toneText: Record<string, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-amber-500",
  destructive: "text-destructive",
};
const toneIcon: Record<string, string> = {
  default: "text-muted-foreground bg-muted",
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-amber-500 bg-amber-500/10",
  destructive: "text-destructive bg-destructive/10",
};

export function AdminStatStrip({ stats, cols = 4 }: { stats: AdminStat[]; cols?: 2 | 3 | 4 }) {
  const gridCols = cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 gap-2.5", gridCols)}>
      {stats.map((s) => {
        const tone = s.tone || "default";
        return (
          <div key={s.label} className="border rounded-xl bg-card p-3 flex items-center gap-2.5">
            {s.icon && (
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", toneIcon[tone])}>
                <s.icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground/60 font-semibold truncate">{s.label}</p>
              <p className={cn("text-lg font-bold tracking-tight truncate", toneText[tone])}>{s.value}</p>
              {s.hint && <p className="text-[10px] text-muted-foreground truncate">{s.hint}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
