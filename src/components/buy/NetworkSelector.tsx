/**
 * NetworkSelector - Tinted glass network tiles with brand identity
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

const networkMeta: Record<string, { dot: string; activeBorder: string; glow: string }> = {
  MTN: {
    dot: "bg-network-mtn",
    activeBorder: "border-network-mtn/40",
    glow: "shadow-[0_0_20px_-6px_hsl(48_100%_50%/0.2)]",
  },
  Telecel: {
    dot: "bg-network-telecel",
    activeBorder: "border-network-telecel/40",
    glow: "shadow-[0_0_20px_-6px_hsl(0_72%_51%/0.15)]",
  },
  AirtelTigo: {
    dot: "bg-network-airteltigo",
    activeBorder: "border-network-airteltigo/40",
    glow: "shadow-[0_0_20px_-6px_hsl(210_80%_52%/0.15)]",
  },
};

const defaultMeta = {
  dot: "bg-primary",
  activeBorder: "border-primary/40",
  glow: "",
};

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="flex gap-2.5">
      {networks.map((net) => {
        const isActive = selected === net;
        const m = networkMeta[net] || defaultMeta;

        return (
          <button
            key={net}
            type="button"
            onClick={() => onSelect(net)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl transition-all duration-250",
              isActive
                ? `glass-strong ${m.activeBorder} ${m.glow}`
                : "glass-subtle border-transparent hover:bg-accent/30 active:scale-[0.97]"
            )}
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-200",
                isActive ? `${m.dot} scale-110` : "bg-muted-foreground/30"
              )}
            />
            <span
              className={cn(
                "text-sm transition-colors duration-200",
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
