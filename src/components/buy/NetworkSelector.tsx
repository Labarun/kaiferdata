/**
 * NetworkSelector — Premium Ghana-only liquid-glass network tiles
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

const BRAND: Record<string, {
  letter: string;
  dotColor: string;
  tint: string;
  activeBorder: string;
  activeGlow: string;
  accentBg: string;
}> = {
  MTN: {
    letter: "M",
    dotColor: "bg-[hsl(var(--network-mtn))]",
    tint: "from-[hsl(48_100%_50%/0.08)] to-[hsl(48_100%_50%/0.01)]",
    activeBorder: "border-[hsl(48_100%_50%/0.2)]",
    activeGlow: "shadow-[0_0_24px_-6px_hsl(48_100%_50%/0.18),inset_0_1px_0_0_hsl(48_100%_60%/0.08)]",
    accentBg: "bg-[hsl(48_100%_50%/0.12)]",
  },
  Telecel: {
    letter: "T",
    dotColor: "bg-[hsl(var(--network-telecel))]",
    tint: "from-[hsl(0_72%_51%/0.06)] to-[hsl(0_72%_51%/0.01)]",
    activeBorder: "border-[hsl(0_72%_51%/0.18)]",
    activeGlow: "shadow-[0_0_24px_-6px_hsl(0_72%_51%/0.14),inset_0_1px_0_0_hsl(0_72%_60%/0.06)]",
    accentBg: "bg-[hsl(0_72%_51%/0.1)]",
  },
  AirtelTigo: {
    letter: "A",
    dotColor: "bg-[hsl(var(--network-airteltigo))]",
    tint: "from-[hsl(210_80%_52%/0.06)] to-[hsl(210_80%_52%/0.01)]",
    activeBorder: "border-[hsl(210_80%_52%/0.18)]",
    activeGlow: "shadow-[0_0_24px_-6px_hsl(210_80%_52%/0.14),inset_0_1px_0_0_hsl(210_80%_62%/0.06)]",
    accentBg: "bg-[hsl(210_80%_52%/0.1)]",
  },
};

const fallback = {
  letter: "?",
  dotColor: "bg-primary",
  tint: "from-primary/5 to-transparent",
  activeBorder: "border-primary/20",
  activeGlow: "",
  accentBg: "bg-primary/10",
};

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
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
                ? `glass-elevated bg-gradient-to-b ${b.tint} ${b.activeBorder} ${b.activeGlow}`
                : "glass-card hover:border-[hsl(220_30%_55%/0.1)] active:scale-[0.97]"
            )}
          >
            {/* Brand circle */}
            <div
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 text-[13px] font-semibold",
                isActive
                  ? `${b.accentBg} text-foreground shadow-sm`
                  : "bg-muted/50 text-muted-foreground"
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
                isActive ? `w-6 ${b.dotColor}` : "w-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
