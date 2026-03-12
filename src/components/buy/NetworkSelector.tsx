/**
 * NetworkSelector — Premium iconic Ghana network tiles with rich interaction
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

const BRAND: Record<string, {
  letter: string;
  color: string;
  activeRing: string;
  activeIconBg: string;
  activeTint: string;
  glowClass: string;
  dotHsl: string;
  activeBorderColor: string;
}> = {
  MTN: {
    letter: "M",
    color: "text-[hsl(46_90%_38%)]",
    activeRing: "ring-[hsl(46_90%_55%/0.35)]",
    activeIconBg: "bg-[hsl(46_100%_50%/0.16)]",
    activeTint: "from-[hsl(46_100%_50%/0.08)] via-transparent to-[hsl(46_80%_60%/0.03)]",
    glowClass: "glow-mtn",
    dotHsl: "46 100% 46%",
    activeBorderColor: "border-[hsl(46_80%_60%/0.35)]",
  },
  Telecel: {
    letter: "T",
    color: "text-[hsl(0_60%_42%)]",
    activeRing: "ring-[hsl(0_60%_55%/0.3)]",
    activeIconBg: "bg-[hsl(0_68%_50%/0.12)]",
    activeTint: "from-[hsl(0_68%_50%/0.06)] via-transparent to-[hsl(0_50%_55%/0.02)]",
    glowClass: "glow-telecel",
    dotHsl: "0 68% 48%",
    activeBorderColor: "border-[hsl(0_55%_60%/0.3)]",
  },
  AirtelTigo: {
    letter: "A",
    color: "text-[hsl(212_65%_42%)]",
    activeRing: "ring-[hsl(212_65%_55%/0.3)]",
    activeIconBg: "bg-[hsl(212_78%_50%/0.12)]",
    activeTint: "from-[hsl(212_78%_50%/0.06)] via-transparent to-[hsl(212_60%_55%/0.02)]",
    glowClass: "glow-airteltigo",
    dotHsl: "212 78% 48%",
    activeBorderColor: "border-[hsl(212_60%_60%/0.3)]",
  },
};

const fallback = {
  letter: "?",
  color: "text-primary",
  activeRing: "ring-primary/20",
  activeIconBg: "bg-primary/8",
  activeTint: "from-primary/5 via-transparent to-transparent",
  glowClass: "glow-brand",
  dotHsl: "215 72% 42%",
  activeBorderColor: "border-primary/25",
};

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {networks.map((net, i) => {
        const isActive = selected === net;
        const b = BRAND[net] || fallback;

        return (
          <button
            key={net}
            type="button"
            onClick={() => onSelect(net)}
            className={cn(
              "relative flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl transition-all duration-300 ease-out",
              "active:scale-[0.95] active:duration-100",
              isActive
                ? `glass-elevated bg-gradient-to-b ${b.activeTint} ${b.glowClass} ${b.activeBorderColor}`
                : "glass-card hover:glass-elevated"
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Brand icon circle */}
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 text-[15px] font-bold tracking-tight",
                isActive
                  ? `${b.activeIconBg} ${b.color} ring-2 ${b.activeRing} shadow-[0_2px_12px_-2px_hsl(${b.dotHsl}/0.2)]`
                  : "bg-[hsl(215_18%_94%/0.7)] text-muted-foreground/45 border border-[hsl(215_18%_88%/0.5)]"
              )}
            >
              {b.letter}
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
                  isActive ? "text-primary/60 opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
              >
                Selected
              </span>
            </div>

            {/* Active bottom accent line */}
            <div
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-400",
                isActive ? "w-10" : "w-0"
              )}
              style={isActive ? {
                background: `hsl(${b.dotHsl})`,
                boxShadow: `0 0 12px 2px hsl(${b.dotHsl} / 0.35)`,
              } : undefined}
            />

            {/* Active top shimmer line */}
            {isActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-3/4 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, hsl(${b.dotHsl} / 0.2), transparent)`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
