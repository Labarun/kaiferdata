/**
 * PlanSelector — Premium product tiles with network-aware selection colors
 * Memoized for performance
 */
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DataPlan } from "@/services/purchaseIntent";
import { Check, ChevronRight, AlertTriangle } from "lucide-react";
import { getNetworkBrand } from "@/config/networkBrands";

/** Inline WhatsApp glyph (lucide has no brand icon). */
function WhatsAppIcon({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.99-1.107zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

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
  const isBuyingPaused = plan.buying_enabled === false;
  const CardWrapper = isBuyingPaused ? "div" : "button";

  return (
    <CardWrapper
      {...(isBuyingPaused ? {} : { type: "button", onClick: () => onSelect(plan) })}
      className={cn(
        "group relative flex flex-col rounded-2xl text-left overflow-hidden",
        "transition-[transform,box-shadow,border-color,background] duration-200 ease-out",
        isBuyingPaused
          ? "opacity-90 bg-muted/10 border border-border/30"
          : isActive
            ? "glass-elevated refraction-rim -translate-y-[1px] active:scale-[0.97] active:duration-100"
            : "glass-card hover:glass-elevated hover:-translate-y-[1px] active:scale-[0.97] active:duration-100"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        ...((isActive && !isBuyingPaused) ? {
          boxShadow: `0 0 24px -4px hsl(${brandHsl} / 0.22), 0 6px 20px -6px hsl(${brandHsl} / 0.15), 0 1px 3px 0 hsl(213 35% 50% / 0.06)`,
        } : {}),
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-[2px] transition-[background] duration-300"
        style={(isActive && !isBuyingPaused) ? {
          background: `linear-gradient(90deg, transparent, hsl(${brandHsl} / 0.7), transparent)`,
        } : {
          background: `linear-gradient(90deg, transparent, hsl(0 0% 50% / 0.06), transparent)`,
        }}
      />

      <div className="p-4 pb-3.5 flex flex-col gap-2.5 relative">
        {(isActive && !isBuyingPaused) && (
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
              "text-[22px] font-bold leading-none tracking-tight transition-colors duration-200",
              isBuyingPaused
                ? "text-muted-foreground/80"
                : isActive
                  ? "text-foreground/90"
                  : "text-foreground/75"
            )}
            style={(isActive && !isBuyingPaused) ? { color: `hsl(${brandHsl})` } : undefined}
          >
            {plan.volume}
          </span>
          {isBuyingPaused ? (
            <div className="h-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5" />
          ) : (
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
          )}
        </div>

        <span className="text-[10px] text-muted-foreground/40 leading-snug line-clamp-1 font-medium relative z-[1]">
          {plan.plan_name}
        </span>

        <div className={cn(
          "pt-2.5 border-t border-border/20 relative z-[1] flex",
          isBuyingPaused
            ? "flex-col gap-1.5 items-start sm:flex-row sm:items-center sm:justify-between sm:gap-0 w-full"
            : "flex-row items-center justify-between w-full"
        )}>
          <span
            className={cn(
              "tracking-tight transition-colors duration-200 font-bold",
              isBuyingPaused ? "text-muted-foreground/90" : !isActive && "text-foreground/60"
            )}
            style={(isActive && !isBuyingPaused) ? { color: `hsl(${brandHsl})` } : undefined}
          >
            <span className="text-[12px]">GH₵</span>
            <span className="text-[16px] ml-[1px]">{Number(plan.amount).toFixed(2)}</span>
          </span>
          {isBuyingPaused ? (
            <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-border/40 bg-slate-900/50 dark:bg-slate-900/80 text-muted-foreground/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider select-none shrink-0">
              <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
              Unavailable
            </div>
          ) : (
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-[transform,color] duration-200",
                isActive
                  ? "translate-x-0"
                  : "text-muted-foreground/20 -translate-x-1 group-hover:translate-x-0 group-hover:text-muted-foreground/35"
              )}
              style={isActive ? { color: `hsl(${brandHsl} / 0.5)` } : undefined}
            />
          )}
        </div>

        {isBuyingPaused && (
          <a
            href="https://whatsapp.com/channel/0029VbCn7xiKbYMWspFUrd2r"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 pt-2 border-t border-border/10 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#25D366] hover:text-[#1fb855] hover:underline transition-colors relative z-[2]"
          >
            <WhatsAppIcon size={12} className="shrink-0" />
            Get notified when it's back.
          </a>
        )}
      </div>
    </CardWrapper>
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
