/**
 * PlanSelector - Compact premium bundle cards with strong price/volume hierarchy
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
      <div className="text-center py-8 rounded-xl border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No plans available for this network.</p>
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
              "group relative flex flex-col rounded-xl border transition-all duration-200 text-left overflow-hidden",
              "animate-fade-in active:scale-[0.97]",
              isActive
                ? "bg-primary/8 border-primary/40 ring-2 ring-primary/15 shadow-sm"
                : "bg-card border-border/50 hover:border-border hover:shadow-sm"
            )}
            style={{ animationDelay: `${i * 25}ms` }}
          >
            {/* Top accent bar */}
            <div
              className={cn(
                "h-0.5 w-full transition-all duration-200",
                isActive ? "bg-primary" : "bg-transparent"
              )}
            />

            <div className="p-3 flex flex-col gap-1.5">
              {/* Volume + check */}
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "text-base font-extrabold leading-tight",
                    isActive ? "text-primary" : "text-foreground"
                  )}
                >
                  {plan.volume}
                </span>
                {isActive && (
                  <span className="h-4.5 w-4.5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                )}
              </div>

              {/* Plan name */}
              <span className="text-[10px] text-muted-foreground leading-snug line-clamp-1">
                {plan.plan_name}
              </span>

              {/* Price */}
              <span
                className={cn(
                  "text-sm font-extrabold mt-0.5",
                  isActive ? "text-primary" : "text-foreground"
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
