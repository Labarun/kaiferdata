/**
 * PlanSelector - Compact premium data plan cards
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
    <div className="grid grid-cols-2 gap-2.5">
      {plans.map((plan, i) => {
        const isActive = selected?.id === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan)}
            className={cn(
              "relative flex flex-col p-3.5 rounded-xl border-2 transition-all duration-200 text-left",
              "animate-fade-in",
              isActive
                ? "bg-primary/8 border-primary shadow-sm scale-[1.01]"
                : "bg-card border-border/60 hover:border-border hover:shadow-sm"
            )}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {isActive && (
              <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <span className={cn(
              "text-lg font-extrabold leading-none",
              isActive ? "text-primary" : "text-foreground"
            )}>
              {plan.volume}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 leading-snug">{plan.plan_name}</span>
            <span className={cn(
              "text-sm font-extrabold mt-2.5",
              isActive ? "text-primary" : "text-foreground"
            )}>
              GH₵{Number(plan.amount).toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}