/**
 * PlanSelector — Premium product tiles with network-aware selection colors
 */
import { cn } from "@/lib/utils";
import type { DataPlan } from "@/services/purchaseIntent";
import { Check, ChevronRight } from "lucide-react";
import { getNetworkBrand } from "@/config/networkBrands";

interface PlanSelectorProps {
  plans: DataPlan[];
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
  /** Currently selected network — drives selected-card accent color */
  network?: string | null;
}

export function PlanSelector({ plans, selected, onSelect, network }: PlanSelectorProps) {
  const brand = getNetworkBrand(network || "");

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
              "active:scale-[0.95] active:duration-100",
              isActive
                ? "glass-elevated refraction-rim"
                : "glass-card hover:glass-elevated"
            )}
            style={{
              animationDelay: `${i * 50}ms`,
              ...(isActive ? {
                boxShadow: `0 0 20px -4px hsl(${brand.hsl} / 0.2), 0 4px 16px -4px hsl(${brand.hsl} / 0.12)`,
              } : {}),
            }}
          >
            {/* Top accent bar — network colored */}
            <div
              className="h-[2px] transition-all duration-400"
              style={isActive ? {
                background: `linear-gradient(90deg, transparent, hsl(${brand.hsl} / 0.7), transparent)`,
              } : {
                background: `linear-gradient(90deg, transparent, hsl(0 0% 50% / 0.06), transparent)`,
              }}
            />

            <div className="p-4 pb-3.5 flex flex-col gap-2.5 relative">
              {/* Active inner glow — network tinted */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-b-2xl pointer-events-none"
                  style={{
                    background: `linear-gradient(to bottom, hsl(${brand.hsl} / 0.06), transparent, hsl(${brand.hsl} / 0.02))`,
                  }}
                />
              )}

              {/* Volume */}
              <div className="flex items-start justify-between relative z-[1]">
                <span
                  className={cn(
                    "text-[21px] font-bold leading-none tracking-tight transition-colors duration-200",
                    isActive ? "text-foreground/90" : "text-foreground/80"
                  )}
                  style={isActive ? { color: `hsl(${brand.hsl})` } : undefined}
                >
                  {plan.volume}
                </span>
                <div
                  className={cn(
                    "h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    "transition-all duration-300",
                    !isActive && "border border-border/40 bg-secondary/40 group-hover:border-border/60"
                  )}
                  style={isActive ? {
                    background: `hsl(${brand.hsl})`,
                    boxShadow: `0 0 14px -2px hsl(${brand.hsl} / 0.4)`,
                  } : undefined}
                >
                  {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
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
                    !isActive && "text-foreground/60"
                  )}
                  style={isActive ? { color: `hsl(${brand.hsl})` } : undefined}
                >
                  GH₵{Number(plan.amount).toLocaleString()}
                </span>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-all duration-200",
                    isActive
                      ? "translate-x-0"
                      : "text-muted-foreground/20 -translate-x-1 group-hover:translate-x-0 group-hover:text-muted-foreground/35"
                  )}
                  style={isActive ? { color: `hsl(${brand.hsl} / 0.5)` } : undefined}
                />
              </div>
            </div>

            {/* Active bottom shine — network colored */}
            {isActive && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, transparent, hsl(${brand.hsl} / 0.25), transparent)`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
