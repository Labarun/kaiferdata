/**
 * AdminStatStrip — premium glass summary stats for the top of admin pages.
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
  default: "text-muted-foreground bg-muted/60 ring-foreground/5",
  primary: "text-primary bg-primary/10 ring-primary/15",
  success: "text-success bg-success/10 ring-success/15",
  warning: "text-amber-500 bg-amber-500/10 ring-amber-500/15",
  destructive: "text-destructive bg-destructive/10 ring-destructive/15",
};
const toneGlow: Record<string, string> = {
  default: "bg-foreground/5",
  primary: "bg-primary/15",
  success: "bg-success/15",
  warning: "bg-amber-500/15",
  destructive: "bg-destructive/15",
};

export function AdminStatStrip({ stats, cols = 4 }: { stats: AdminStat[]; cols?: 2 | 3 | 4 | 5 }) {
  const gridCols = cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : cols === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 animate-fade-in", gridCols)}>
      {stats.map((s) => {
        const tone = s.tone || "default";
        return (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-2xl glass-card p-3.5 group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
          >
            <div
              className={cn(
                "absolute -top-7 -right-7 w-20 h-20 rounded-full blur-2xl pointer-events-none opacity-70 group-hover:scale-125 transition-transform duration-700",
                toneGlow[tone],
              )}
            />
            <div className="relative flex items-center gap-3">
              {s.icon && (
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset", toneIcon[tone])}>
                  <s.icon className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground/60 font-semibold truncate">{s.label}</p>
                <p className={cn("text-lg font-bold tracking-tight truncate leading-tight", toneText[tone])}>{s.value}</p>
                {s.hint && <p className="text-[10px] text-muted-foreground truncate">{s.hint}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
