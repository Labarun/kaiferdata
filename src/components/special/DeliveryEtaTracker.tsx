/**
 * DeliveryEtaTracker — the SPECIAL BUNDLE delivery tracker.
 *
 * Deliberately separate from the normal-bundle delivery indicator. Shows the
 * current expected MAXIMUM delivery time, set by admins, and makes clear it
 * can arrive earlier.
 */
import { Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DELIVERY_ETA_OPTIONS,
  DELIVERY_ETA_ORDER,
  type SpecialDeliveryEta,
} from "@/services/specialBundles";

export function DeliveryEtaTracker({
  eta,
  compact = false,
  className,
}: {
  eta: SpecialDeliveryEta;
  compact?: boolean;
  className?: string;
}) {
  const conf = DELIVERY_ETA_OPTIONS[eta];
  const activeIndex = DELIVERY_ETA_ORDER.indexOf(eta);

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium", conf.tone, className)}>
        <Clock className="h-3.5 w-3.5" />
        <span>Delivery: {conf.short}</span>
      </div>
    );
  }

  return (
    <div className={cn("glass-card rounded-2xl p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
              Current delivery time
            </p>
            <p className={cn("text-sm font-bold", conf.tone)}>{conf.label}</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {DELIVERY_ETA_ORDER.map((step, i) => {
          const reached = i <= activeIndex;
          return (
            <div key={step} className="flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  reached ? "bg-primary" : "bg-muted",
                  i === activeIndex && "bg-gradient-to-r from-primary to-primary/60",
                )}
              />
              <p
                className={cn(
                  "mt-1 text-[8.5px] sm:text-[9.5px] text-center leading-tight",
                  i === activeIndex ? "text-foreground font-semibold" : "text-muted-foreground/60",
                )}
              >
                {DELIVERY_ETA_OPTIONS[step].short}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
        {conf.helper}{" "}
        <span className="text-muted-foreground/70">
          This is the current expected <span className="font-semibold">maximum</span> — your bundle can arrive earlier.
        </span>
      </p>
    </div>
  );
}
