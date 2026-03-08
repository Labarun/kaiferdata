/**
 * PlanSelector — Premium liquid-glass bundle cards
 */
import { cn } from "@/lib/utils";
import type { DataPlan } from "@/services/purchaseIntent";
import { Check, ArrowRight } from "lucide-react";

interface PlanSelectorProps {
  plans: DataPlan[];
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
}

export function PlanSelector({ plans, selected, onSelect }: PlanSelectorProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl glass-card">
        <p className="text-xs text-muted-foreground">No plans available for this network yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {plans.map((plan, i) => {
        const isActive = selected?.id === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan)}
            className={cn(
              "group relative flex flex-col rounded-2xl transition-all duration-300 text-left overflow-hidden",
              "animate-fade-in active:scale-[0.97]",
              isActive
                ? "glass-elevated border-primary/15 shadow-[0_0_24px_-6px_hsl(42_88%_56%/0.14),inset_0_1px_0_0_hsl(42_90%_72%/0.06)]"
                : "glass-card hover:border-[hsl(220_30%_55%/0.1)]"
            )}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {/* Top accent */}
            <div
              className={cn(
                "h-[2px] transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                  : "bg-transparent"
              )}
            />

            <div className="p-3 flex flex-col gap-1.5">
              {/* Volume */}
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "text-base font-semibold leading-tight tracking-tight transition-colors",
                    isActive ? "text-primary" : "text-foreground/85"
                  )}
                >
                  {plan.volume}
                </span>
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                    isActive
                      ? "bg-primary shadow-[0_0_10px_-2px_hsl(42_88%_56%/0.35)]"
                      : "border border-border/40"
                  )}
                >
                  {isActive && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
              </div>

              {/* Plan name */}
              <span className="text-[10px] text-muted-foreground/70 leading-snug line-clamp-1">
                {plan.plan_name}
              </span>

              {/* Price row */}
              <div className="flex items-center justify-between mt-1">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? "text-primary" : "text-foreground/70"
                  )}
                >
                  GH₵{Number(plan.amount).toLocaleString()}
                </span>
                <ArrowRight
                  className={cn(
                    "h-3 w-3 transition-all duration-200",
                    isActive ? "text-primary/60 translate-x-0" : "text-muted-foreground/30 -translate-x-0.5 group-hover:translate-x-0 group-hover:text-muted-foreground/50"
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
