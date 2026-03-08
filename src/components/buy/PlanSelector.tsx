/**
 * PlanSelector — Premium desirable bundle cards
 */
import { cn } from "@/lib/utils";
import type { DataPlan } from "@/services/purchaseIntent";
import { Check, ChevronRight } from "lucide-react";

interface PlanSelectorProps {
  plans: DataPlan[];
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
}

export function PlanSelector({ plans, selected, onSelect }: PlanSelectorProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-14 rounded-2xl glass-card">
        <p className="text-xs text-muted-foreground">No plans available for this network yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {plans.map((plan, i) => {
        const isActive = selected?.id === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan)}
            className={cn(
              "group relative flex flex-col rounded-2xl transition-all duration-300 text-left overflow-hidden",
              "animate-fade-in active:scale-[0.96]",
              isActive
                ? "glass-premium border-primary/30 glow-gold-strong"
                : "glass-card hover:glass-elevated"
            )}
            style={{ animationDelay: `${i * 35}ms` }}
          >
            {/* Top accent bar */}
            <div
              className={cn(
                "h-[2.5px] transition-all duration-400",
                isActive
                  ? "bg-gradient-to-r from-primary/10 via-primary/60 to-primary/10"
                  : "bg-gradient-to-r from-transparent via-border/20 to-transparent"
              )}
            />

            <div className="p-4 flex flex-col gap-2">
              {/* Volume — the hero text */}
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "text-[20px] font-bold leading-none tracking-tight transition-colors",
                    isActive ? "text-gradient-gold" : "text-foreground/75"
                  )}
                >
                  {plan.volume}
                </span>
                <div
                  className={cn(
                    "h-5.5 w-5.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                    isActive
                      ? "bg-primary shadow-[0_0_10px_-1px_hsl(38_82%_44%/0.35)]"
                      : "border border-border/50 bg-background/50"
                  )}
                  style={{ height: 22, width: 22 }}
                >
                  {isActive && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                </div>
              </div>

              {/* Plan name */}
              <span className="text-[10px] text-muted-foreground/50 leading-snug line-clamp-1 font-medium">
                {plan.plan_name}
              </span>

              {/* Price row */}
              <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/25">
                <span
                  className={cn(
                    "text-[15px] font-bold transition-colors",
                    isActive ? "text-primary" : "text-foreground/60"
                  )}
                >
                  GH₵{Number(plan.amount).toLocaleString()}
                </span>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-all duration-200",
                    isActive
                      ? "text-primary/50 translate-x-0"
                      : "text-muted-foreground/20 -translate-x-1 group-hover:translate-x-0 group-hover:text-muted-foreground/35"
                  )}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
