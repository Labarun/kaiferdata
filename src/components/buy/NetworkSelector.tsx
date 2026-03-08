/**
 * NetworkSelector — Premium iconic Ghana network tiles
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
  activeBg: string;
  activeBorder: string;
  activeGlow: string;
  dotColor: string;
  ringColor: string;
  tintBg: string;
}> = {
  MTN: {
    letter: "M",
    color: "text-[hsl(46_90%_38%)]",
    activeBg: "bg-[hsl(46_100%_50%/0.1)]",
    activeBorder: "border-[hsl(46_80%_55%/0.4)]",
    activeGlow: "shadow-[0_0_0_1px_hsl(46_80%_55%/0.1),0_4px_20px_-4px_hsl(46_100%_48%/0.18),0_12px_40px_-12px_hsl(46_100%_48%/0.1),inset_0_1.5px_0_0_hsl(46_100%_65%/0.2)]",
    dotColor: "bg-[hsl(var(--network-mtn))]",
    ringColor: "ring-[hsl(46_100%_48%/0.2)]",
    tintBg: "from-[hsl(46_100%_50%/0.06)] to-[hsl(46_100%_50%/0.01)]",
  },
  Telecel: {
    letter: "T",
    color: "text-[hsl(0_60%_42%)]",
    activeBg: "bg-[hsl(0_68%_50%/0.07)]",
    activeBorder: "border-[hsl(0_60%_55%/0.35)]",
    activeGlow: "shadow-[0_0_0_1px_hsl(0_60%_55%/0.08),0_4px_20px_-4px_hsl(0_68%_48%/0.14),0_12px_40px_-12px_hsl(0_68%_48%/0.08),inset_0_1.5px_0_0_hsl(0_68%_65%/0.15)]",
    dotColor: "bg-[hsl(var(--network-telecel))]",
    ringColor: "ring-[hsl(0_68%_48%/0.15)]",
    tintBg: "from-[hsl(0_68%_50%/0.04)] to-[hsl(0_68%_50%/0.005)]",
  },
  AirtelTigo: {
    letter: "A",
    color: "text-[hsl(212_65%_42%)]",
    activeBg: "bg-[hsl(212_78%_50%/0.07)]",
    activeBorder: "border-[hsl(212_65%_55%/0.35)]",
    activeGlow: "shadow-[0_0_0_1px_hsl(212_65%_55%/0.08),0_4px_20px_-4px_hsl(212_78%_48%/0.14),0_12px_40px_-12px_hsl(212_78%_48%/0.08),inset_0_1.5px_0_0_hsl(212_78%_65%/0.15)]",
    dotColor: "bg-[hsl(var(--network-airteltigo))]",
    ringColor: "ring-[hsl(212_78%_48%/0.15)]",
    tintBg: "from-[hsl(212_78%_50%/0.04)] to-[hsl(212_78%_50%/0.005)]",
  },
};

const fallback = {
  letter: "?",
  color: "text-primary",
  activeBg: "bg-primary/8",
  activeBorder: "border-primary/25",
  activeGlow: "",
  dotColor: "bg-primary",
  ringColor: "ring-primary/15",
  tintBg: "from-primary/5 to-transparent",
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
              "relative flex flex-col items-center gap-3 py-5 px-2 rounded-2xl transition-all duration-300 animate-fade-in-up",
              isActive
                ? `glass-premium bg-gradient-to-b ${b.tintBg} ${b.activeBorder} ${b.activeGlow}`
                : "glass-card hover:glass-elevated active:scale-[0.96]"
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Brand icon circle */}
            <div
              className={cn(
                "h-11 w-11 rounded-2xl flex items-center justify-center transition-all duration-300 text-[15px] font-bold",
                isActive
                  ? `${b.activeBg} ${b.color} ring-2 ${b.ringColor}`
                  : "bg-muted/30 text-muted-foreground/50"
              )}
            >
              {b.letter}
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  "text-[13px] tracking-tight transition-all duration-200",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground font-medium"
                )}
              >
                {net}
              </span>
              {isActive && (
                <span className="text-[9px] text-primary/60 font-medium tracking-wide animate-fade-in">
                  Selected
                </span>
              )}
            </div>

            {/* Active bottom accent */}
            <div
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full transition-all duration-400",
                isActive ? `w-8 ${b.dotColor} shadow-[0_0_8px_2px_hsl(var(--network-${net.toLowerCase().replace('airteltigo','airteltigo')})/0.3)]` : "w-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
