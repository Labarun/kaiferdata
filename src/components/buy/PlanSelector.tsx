/**
 * PlanSelector - Premium liquid-glass bundle cards
 */
import { cn } from "@/lib/utils";
import type { DataPlan } from "@/services/purchaseIntent";
import { Check } from "lucide-react";

interface PlanSelectorProps {
  plans: DataPlan[];
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
}

export function PlanSelector({ plans, selected, onSelect }: PlanSelectorProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-10 rounded-2xl glass-card">
        <p className="text-[11px] text-muted-foreground">No plans available for this network.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
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
                ? "glass-elevated border-primary/20 shadow-[0_0_28px_-8px_hsl(42_88%_56%/0.15)]"
                : "glass-card hover:border-muted-foreground/10 hover:shadow-[0_4px_20px_-8px_hsl(228_40%_3%/0.4)]"
            )}
            style={{ animationDelay: `${i * 25}ms` }}
          >
            {/* Top accent bar */}
            <div
              className={cn(
                "h-[2px] w-full transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                  : "bg-transparent"
              )}
            />

            <div className="p-3.5 flex flex-col gap-2">
              {/* Volume + check */}
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "text-[15px] font-medium leading-tight tracking-tight transition-colors duration-200",
                    isActive ? "text-primary" : "text-foreground/90"
                  )}
                >
                  {plan.volume}
                </span>
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                    isActive
                      ? "bg-primary shadow-[0_0_12px_-3px_hsl(42_88%_56%/0.4)]"
                      : "border border-border/60 bg-transparent"
                  )}
                >
                  {isActive && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
              </div>

              {/* Plan name */}
              <span className="text-[10px] text-muted-foreground leading-snug line-clamp-1">
                {plan.plan_name}
              </span>

              {/* Price */}
              <span
                className={cn(
                  "text-sm font-medium mt-auto transition-colors duration-200",
                  isActive ? "text-primary" : "text-foreground/80"
                )}
              >
                GH₵{Number(plan.amount).toLocaleString()}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
