/**
 * NetworkSelector - Premium branded liquid-glass network tiles
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

const networkMeta: Record<string, {
  dot: string;
  gradient: string;
  activeBorder: string;
  activeGlow: string;
  activeBg: string;
}> = {
  MTN: {
    dot: "bg-network-mtn",
    gradient: "from-[hsl(48_100%_50%/0.1)] to-transparent",
    activeBorder: "border-[hsl(48_100%_50%/0.25)]",
    activeGlow: "shadow-[0_0_28px_-8px_hsl(48_100%_50%/0.2)]",
    activeBg: "bg-[hsl(48_100%_50%/0.06)]",
  },
  Telecel: {
    dot: "bg-network-telecel",
    gradient: "from-[hsl(0_72%_51%/0.08)] to-transparent",
    activeBorder: "border-[hsl(0_72%_51%/0.2)]",
    activeGlow: "shadow-[0_0_28px_-8px_hsl(0_72%_51%/0.15)]",
    activeBg: "bg-[hsl(0_72%_51%/0.04)]",
  },
  AirtelTigo: {
    dot: "bg-network-airteltigo",
    gradient: "from-[hsl(210_80%_52%/0.08)] to-transparent",
    activeBorder: "border-[hsl(210_80%_52%/0.2)]",
    activeGlow: "shadow-[0_0_28px_-8px_hsl(210_80%_52%/0.15)]",
    activeBg: "bg-[hsl(210_80%_52%/0.04)]",
  },
};

const defaultMeta = {
  dot: "bg-primary",
  gradient: "from-primary/8 to-transparent",
  activeBorder: "border-primary/25",
  activeGlow: "",
  activeBg: "bg-primary/5",
};

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="flex gap-2">
      {networks.map((net) => {
        const isActive = selected === net;
        const m = networkMeta[net] || defaultMeta;

        return (
          <button
            key={net}
            type="button"
            onClick={() => onSelect(net)}
            className={cn(
              "relative flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-300",
              isActive
                ? `glass-elevated bg-gradient-to-b ${m.gradient} ${m.activeBorder} ${m.activeGlow}`
                : "glass-card hover:border-muted-foreground/10 active:scale-[0.97]"
            )}
          >
            {/* Top accent line */}
            <div
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300",
                isActive ? `w-8 ${m.dot}` : "w-0"
              )}
            />

            <span
              className={cn(
                "h-3 w-3 rounded-full transition-all duration-300",
                isActive ? `${m.dot} scale-110 shadow-sm` : "bg-muted-foreground/25"
              )}
            />
            <span
              className={cn(
                "text-[13px] transition-all duration-200",
                isActive ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {net}
            </span>
          </button>
        );
      })}
    </div>
  );
}
