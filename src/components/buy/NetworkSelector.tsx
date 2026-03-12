/**
 * NetworkSelector — Premium glass tiles with real telecom logos
 */
import { cn } from "@/lib/utils";
import { getNetworkBrand } from "@/config/networkBrands";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {networks.map((net, i) => {
        const isActive = selected === net;
        const b = getNetworkBrand(net);

        return (
          <button
            key={net}
            type="button"
            onClick={() => onSelect(net)}
            className={cn(
              "relative flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl transition-all duration-300 ease-out",
              "active:scale-[0.94] active:duration-100",
              isActive
                ? `glass-elevated bg-gradient-to-b ${b.activeTint} ${b.glowClass} ${b.activeBorderColor} refraction-rim`
                : "glass-card hover:glass-elevated"
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Network logo */}
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden",
                isActive
                  ? `${b.activeIconBg} ring-2 ${b.activeRing} shadow-[0_2px_16px_-2px_hsl(${b.hsl}/0.25)]`
                  : "bg-secondary/60 border border-border/30"
              )}
            >
              {b.logo ? (
                <img src={b.logo} alt={`${net} logo`} className="h-12 w-12 object-cover rounded-2xl" />
              ) : (
                <span className="text-[15px] font-bold text-muted-foreground/45">{net[0]}</span>
              )}
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  "text-[13px] tracking-tight transition-all duration-200",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground/70 font-medium"
                )}
              >
                {net}
              </span>
              <span
                className={cn(
                  "text-[9px] font-medium tracking-widest uppercase transition-all duration-300",
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
                style={isActive ? { color: `hsl(${b.hsl})` } : undefined}
              >
                Selected
              </span>
            </div>

            {/* Active bottom accent */}
            <div
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-400",
                isActive ? "w-10" : "w-0"
              )}
              style={isActive ? {
                background: `hsl(${b.hsl})`,
                boxShadow: `0 0 14px 2px hsl(${b.hsl} / 0.35)`,
              } : undefined}
            />

            {/* Active top shimmer */}
            {isActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-3/4 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, hsl(${b.hsl} / 0.2), transparent)`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
