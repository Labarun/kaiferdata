/**
 * PlanSelector - Data plan selection grid
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
      <p className="text-sm text-muted-foreground text-center py-6">
        No plans available for this network.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {plans.map((plan) => {
        const isActive = selected?.id === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan)}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-150 text-center",
              isActive
                ? "bg-primary/10 border-primary text-primary ring-2 ring-primary/20 shadow-sm"
                : "bg-card border-border hover:border-primary/30 hover:bg-muted/50"
            )}
          >
            {isActive && (
              <div className="absolute top-1.5 right-1.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <span className={cn(
              "text-lg font-bold leading-none",
              isActive ? "text-primary" : "text-foreground"
            )}>
              {plan.volume}
            </span>
            <span className={cn(
              "text-xs mt-1",
              isActive ? "text-primary/80" : "text-muted-foreground"
            )}>
              {plan.plan_name}
            </span>
            <span className={cn(
              "text-sm font-bold mt-2",
              isActive ? "text-primary" : "text-foreground"
            )}>
              ₦{Number(plan.amount).toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
