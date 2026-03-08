/**
 * NetworkSelector — Light liquid-glass Ghana network tiles
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

const BRAND: Record<string, {
  letter: string;
  activeBg: string;
  activeBorder: string;
  activeGlow: string;
  dotColor: string;
  tintBg: string;
}> = {
  MTN: {
    letter: "M",
    activeBg: "bg-[hsl(48_100%_50%/0.08)]",
    activeBorder: "border-[hsl(48_100%_55%/0.35)]",
    activeGlow: "shadow-[0_0_20px_-4px_hsl(48_100%_50%/0.15),inset_0_1px_0_0_hsl(48_100%_70%/0.2)]",
    dotColor: "bg-[hsl(var(--network-mtn))]",
    tintBg: "from-[hsl(48_100%_50%/0.06)] to-transparent",
  },
  Telecel: {
    letter: "T",
    activeBg: "bg-[hsl(0_72%_50%/0.05)]",
    activeBorder: "border-[hsl(0_72%_55%/0.3)]",
    activeGlow: "shadow-[0_0_20px_-4px_hsl(0_72%_50%/0.12),inset_0_1px_0_0_hsl(0_72%_65%/0.15)]",
    dotColor: "bg-[hsl(var(--network-telecel))]",
    tintBg: "from-[hsl(0_72%_50%/0.04)] to-transparent",
  },
  AirtelTigo: {
    letter: "A",
    activeBg: "bg-[hsl(210_80%_50%/0.05)]",
    activeBorder: "border-[hsl(210_80%_55%/0.3)]",
    activeGlow: "shadow-[0_0_20px_-4px_hsl(210_80%_50%/0.12),inset_0_1px_0_0_hsl(210_80%_65%/0.15)]",
    dotColor: "bg-[hsl(var(--network-airteltigo))]",
    tintBg: "from-[hsl(210_80%_50%/0.04)] to-transparent",
  },
};

const fallback = {
  letter: "?",
  activeBg: "bg-primary/5",
  activeBorder: "border-primary/25",
  activeGlow: "",
  dotColor: "bg-primary",
  tintBg: "from-primary/5 to-transparent",
};

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {networks.map((net) => {
        const isActive = selected === net;
        const b = BRAND[net] || fallback;

        return (
          <button
            key={net}
            type="button"
            onClick={() => onSelect(net)}
            className={cn(
              "relative flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl transition-all duration-300",
              isActive
                ? `glass-elevated bg-gradient-to-b ${b.tintBg} ${b.activeBorder} ${b.activeGlow}`
                : "glass-card hover:border-[hsl(220_20%_78%/0.6)] active:scale-[0.97]"
            )}
          >
            {/* Brand circle */}
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 text-[14px] font-bold",
                isActive
                  ? `${b.activeBg} text-foreground/90`
                  : "bg-muted/40 text-muted-foreground/70"
              )}
            >
              {b.letter}
            </div>

            <span
              className={cn(
                "text-[13px] tracking-tight transition-all duration-200",
                isActive ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {net}
            </span>

            {/* Active indicator */}
            <div
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300",
                isActive ? `w-7 ${b.dotColor}` : "w-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
