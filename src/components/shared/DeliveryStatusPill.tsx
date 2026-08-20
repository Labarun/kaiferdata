import { Zap, Rocket, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryStatusPillProps {
  isExpress: boolean;
  speedText: string;
  className?: string;
  paused?: boolean;
}

export function DeliveryStatusPill({ isExpress, speedText, className, paused }: DeliveryStatusPillProps) {
  if (paused) return null;

  return (
    <div className={cn("relative z-10 flex flex-col items-center", className)}>
      <div className={cn(
        "flex flex-nowrap items-center w-full md:w-auto max-w-full gap-2 sm:gap-3 rounded-[2rem] border bg-[#0A1A14] p-1.5 pl-1.5 pr-2 sm:pl-3 sm:pr-4 shadow-lg backdrop-blur-xl overflow-hidden transition-all duration-500",
        isExpress 
          ? "border-amber-500/30 shadow-amber-500/10" 
          : "border-success/20 shadow-success/5"
      )}>
        {/* Animated dot */}
        <span className="relative flex h-2 w-2 shrink-0 hidden sm:flex">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            isExpress ? "bg-amber-500/60" : "bg-success/60"
          )} />
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            isExpress ? "bg-amber-500 shadow-[0_0_8px_hsl(35_100%_50%/0.6)]" : "bg-success shadow-[0_0_8px_hsl(150_52%_37%/0.6)]"
          )} />
        </span>

        {/* Icon */}
        <div className={cn(
          "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full shrink-0",
          isExpress ? "bg-amber-500/10 text-amber-500" : "bg-success/10 text-success"
        )}>
          {isExpress ? <Rocket className="h-4 w-4 sm:h-4 sm:w-4" fill="currentColor" /> : <Zap className="h-4 w-4 sm:h-4 sm:w-4" fill="currentColor" />}
        </div>

        {/* Text */}
        <div className="flex flex-1 flex-col mr-1 sm:mr-4 min-w-0 text-left overflow-hidden">
          <p className={cn(
            "text-[11px] sm:text-[13px] font-bold leading-tight truncate",
            isExpress ? "bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent animate-[shimmer_2s_infinite]" : "text-success"
          )}>
            {isExpress ? "Express Delivery:" : "Delivery:"} {speedText}
          </p>
          <p className={cn(
            "text-[9px] sm:text-[11px] leading-tight truncate",
            isExpress ? "text-amber-500/70" : "text-success/70"
          )}>
            Orders are delivered based on this status.
          </p>
        </div>

        {/* Pulse Bars */}
        <div className="flex items-center gap-1 opacity-80 shrink-0 ml-auto hidden sm:flex">
          <div className="flex items-end gap-0.5 h-3">
            <div className={cn("w-[3px] rounded-full h-full animate-[pulse_1s_ease-in-out_infinite]", isExpress ? "bg-amber-500" : "bg-success")} />
            <div className={cn("w-[3px] rounded-full h-[60%] animate-[pulse_1s_ease-in-out_infinite_0.2s]", isExpress ? "bg-amber-500" : "bg-success")} />
            <div className={cn("w-[3px] rounded-full h-[80%] animate-[pulse_1s_ease-in-out_infinite_0.4s]", isExpress ? "bg-amber-500" : "bg-success")} />
          </div>
        </div>

        {/* Live Badge */}
        <div className={cn(
          "ml-1 sm:ml-2 rounded-full border px-1.5 sm:px-2 py-0.5 shrink-0",
          isExpress ? "border-amber-500/30" : "border-success/30"
        )}>
          <span className={cn(
            "text-[9px] sm:text-[10px] font-bold tracking-widest uppercase flex items-center gap-1",
            isExpress ? "text-amber-500" : "text-success"
          )}>
            <span className={cn(
              "h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full",
              isExpress ? "bg-amber-500" : "bg-success"
            )}></span> Live
          </span>
        </div>
      </div>
      <a href="#notices" className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-warning hover:text-warning/80 transition-colors">
        <AlertTriangle className="h-3 w-3" /> Important Notices
      </a>
    </div>
  );
}
