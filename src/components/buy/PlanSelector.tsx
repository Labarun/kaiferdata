/**
 * PlanSelector — Premium desirable bundle product tiles with rich interaction
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
      <div className="text-center py-16 rounded-2xl glass-card">
        <p className="text-xs text-muted-foreground/60">No plans available for this network yet.</p>
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
              "group relative flex flex-col rounded-2xl text-left overflow-hidden",
              "transition-all duration-300 ease-out",
              "active:scale-[0.96] active:duration-100",
              isActive
                ? "glass-elevated glow-brand-strong"
                : "glass-card hover:glass-elevated hover:shadow-[inset_0_1.5px_0_0_hsl(0_0%_100%/0.85),0_4px_16px_-4px_hsl(215_30%_48%/0.12),0_12px_36px_-8px_hsl(215_30%_48%/0.08)]"
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Top accent bar */}
            <div
              className={cn(
                "h-[2px] transition-all duration-400",
                isActive
                  ? "bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  : "bg-gradient-to-r from-transparent via-border/10 to-transparent"
              )}
            />

            <div className="p-4 pb-3.5 flex flex-col gap-2.5 relative">
              {/* Subtle inner glow for active */}
              {isActive && (
                <div className="absolute inset-0 rounded-b-2xl pointer-events-none bg-gradient-to-b from-[hsl(215_60%_85%/0.08)] to-transparent" />
              )}

              {/* Volume — hero text */}
              <div className="flex items-start justify-between relative z-[1]">
                <span
                  className={cn(
                    "text-[21px] font-bold leading-none tracking-tight transition-colors duration-200",
                    isActive ? "text-gradient-brand" : "text-foreground/80"
                  )}
                >
                  {plan.volume}
                </span>
                <div
                  className={cn(
                    "h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    "transition-all duration-300",
                    isActive
                      ? "bg-primary shadow-[0_0_14px_-2px_hsl(215_72%_42%/0.4)] animate-pulse-ring"
                      : "border border-border/40 bg-[hsl(0_0%_100%/0.5)] group-hover:border-border/60"
                  )}
                >
                  {isActive && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                </div>
              </div>

              {/* Plan name */}
              <span className="text-[10.5px] text-muted-foreground/45 leading-snug line-clamp-1 font-medium relative z-[1]">
                {plan.plan_name}
              </span>

              {/* Price row */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border/20 relative z-[1]">
                <span
                  className={cn(
                    "text-[15px] font-bold tracking-tight transition-colors duration-200",
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

            {/* Active bottom shine */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
