/**
 * PlanSelector — Premium product tiles with network-aware selection colors
 * Memoized for performance
 */
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DataPlan } from "@/services/purchaseIntent";
import { Check, ChevronRight } from "lucide-react";
import { getNetworkBrand } from "@/config/networkBrands";

interface PlanSelectorProps {
  plans: DataPlan[];
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
  network?: string | null;
}

const PlanCard = memo(function PlanCard({
  plan,
  isActive,
  index,
  brandHsl,
  onSelect,
}: {
  plan: DataPlan;
  isActive: boolean;
  index: number;
  brandHsl: string;
  onSelect: (plan: DataPlan) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={cn(
        "group relative flex flex-col rounded-2xl text-left overflow-hidden",
        "transition-[transform,box-shadow,border-color,background] duration-200 ease-out",
        "active:scale-[0.97] active:duration-100",
        isActive
          ? "glass-elevated refraction-rim -translate-y-[1px]"
          : "glass-card hover:glass-elevated hover:-translate-y-[1px]"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        ...(isActive ? {
          boxShadow: `0 0 24px -4px hsl(${brandHsl} / 0.22), 0 6px 20px -6px hsl(${brandHsl} / 0.15), 0 1px 3px 0 hsl(213 35% 50% / 0.06)`,
        } : {}),
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-[2px] transition-[background] duration-300"
        style={isActive ? {
          background: `linear-gradient(90deg, transparent, hsl(${brandHsl} / 0.7), transparent)`,
        } : {
          background: `linear-gradient(90deg, transparent, hsl(0 0% 50% / 0.06), transparent)`,
        }}
      />

      <div className="p-4 pb-3.5 flex flex-col gap-2.5 relative">
        {isActive && (
          <div
            className="absolute inset-0 rounded-b-2xl pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, hsl(${brandHsl} / 0.06), transparent, hsl(${brandHsl} / 0.02))`,
            }}
          />
        )}

        <div className="flex items-start justify-between relative z-[1]">
          <span
            className={cn(
              "text-[21px] font-bold leading-none tracking-tight transition-colors duration-200",
              isActive ? "text-foreground/90" : "text-foreground/80"
            )}
            style={isActive ? { color: `hsl(${brandHsl})` } : undefined}
          >
            {plan.volume}
          </span>
          <div
            className={cn(
              "h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5",
              "transition-[background,box-shadow,border-color] duration-300",
              !isActive && "border border-border/40 bg-secondary/40 group-hover:border-border/60"
            )}
            style={isActive ? {
              background: `hsl(${brandHsl})`,
              boxShadow: `0 0 14px -2px hsl(${brandHsl} / 0.4)`,
            } : undefined}
          >
            {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </div>
        </div>

        <span className="text-[10.5px] text-muted-foreground/45 leading-snug line-clamp-1 font-medium relative z-[1]">
          {plan.plan_name}
        </span>

        <div className="flex items-center justify-between pt-2.5 border-t border-border/20 relative z-[1]">
          <span
            className={cn(
              "text-[15px] font-bold tracking-tight transition-colors duration-200",
              !isActive && "text-foreground/60"
            )}
            style={isActive ? { color: `hsl(${brandHsl})` } : undefined}
          >
            GH₵{Number(plan.amount).toLocaleString()}
          </span>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-[transform,color] duration-200",
              isActive
                ? "translate-x-0"
                : "text-muted-foreground/20 -translate-x-1 group-hover:translate-x-0 group-hover:text-muted-foreground/35"
            )}
            style={isActive ? { color: `hsl(${brandHsl} / 0.5)` } : undefined}
          />
        </div>
      </div>

      {isActive && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(${brandHsl} / 0.25), transparent)`,
          }}
        />
      )}
    </button>
  );
});

export const PlanSelector = memo(function PlanSelector({ plans, selected, onSelect, network }: PlanSelectorProps) {
  const brand = useMemo(() => getNetworkBrand(network || ""), [network]);

  if (plans.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl glass-card">
        <p className="text-xs text-muted-foreground/60">No plans available for this network yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {plans.map((plan, i) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isActive={selected?.id === plan.id}
          index={i}
          brandHsl={brand.hsl}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
