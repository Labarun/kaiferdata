/**
 * StatCard - Reusable statistics card for dashboards
 */
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  size?: "default" | "sm";
  trend?: {
    value: number; // positive or negative percentage
    label?: string;
  };
}

const variantStyles = {
  default: {
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted/50",
    glow: "bg-foreground/5",
  },
  primary: {
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    glow: "bg-primary/10",
  },
  success: {
    iconColor: "text-success",
    iconBg: "bg-success/10",
    glow: "bg-success/10",
  },
  warning: {
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    glow: "bg-amber-500/10",
  },
  destructive: {
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10",
    glow: "bg-destructive/10",
  },
};

export function StatCard({ title, value, icon: Icon, description, variant = "default", size = "default", trend }: StatCardProps) {
  const styles = variantStyles[variant] || variantStyles.default;
  const isSm = size === "sm";

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl isolate shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] glass-card border-border/40 group animate-fade-in transition-all duration-300 hover:-translate-y-1",
      isSm ? "p-3.5 md:p-4" : "p-5 md:p-6"
    )}>
      {/* Background Glow Orbs */}
      <div className={cn("absolute top-0 right-0 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0 pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out", isSm ? "w-24 h-24" : "w-32 h-32", styles.glow)} />
      <div className={cn("absolute bottom-0 left-0 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 z-0 pointer-events-none opacity-50", isSm ? "w-16 h-16" : "w-24 h-24", styles.glow)} />
      
      {/* Content */}
      <div className={cn("relative z-10 flex items-center justify-between gap-3", isSm && !description && !trend && "flex-col items-start gap-1.5")}>
        <div className={cn("space-y-1 min-w-0 flex-1", isSm && !description && !trend && "order-2")}>
          <p className={cn("font-semibold uppercase tracking-wider text-muted-foreground/70 truncate", isSm ? "text-[9.5px]" : "text-[11px]")}>{title}</p>
          <div className="flex items-end gap-2 flex-wrap">
            <p className={cn("font-bold text-foreground tracking-tight truncate", isSm ? "text-[18px]" : "text-2xl")}>{value}</p>
            {trend && (
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", trend.value >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                {trend.value > 0 ? "+" : ""}{trend.value.toFixed(1)}%
              </span>
            )}
          </div>
          {description && <p className="text-[11px] text-muted-foreground mt-1 truncate">{description}</p>}
        </div>
        <div className={cn("rounded-xl shrink-0 transition-colors duration-300 ring-1 ring-inset ring-foreground/5", styles.iconBg, isSm ? "p-2 order-1" : "p-2.5")}>
          <Icon className={cn(styles.iconColor, isSm ? "h-4 w-4" : "h-5 w-5")} />
        </div>
      </div>
    </div>
  );
}
