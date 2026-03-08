/**
 * NetworkSelector - Premium segmented network tiles with brand accents
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

const networkMeta: Record<string, { dot: string; activeBg: string; activeBorder: string; activeRing: string }> = {
  MTN: {
    dot: "bg-network-mtn",
    activeBg: "bg-network-mtn/12",
    activeBorder: "border-network-mtn/50",
    activeRing: "ring-network-mtn/20",
  },
  Telecel: {
    dot: "bg-network-telecel",
    activeBg: "bg-network-telecel/10",
    activeBorder: "border-network-telecel/50",
    activeRing: "ring-network-telecel/20",
  },
  AirtelTigo: {
    dot: "bg-network-airteltigo",
    activeBg: "bg-network-airteltigo/10",
    activeBorder: "border-network-airteltigo/50",
    activeRing: "ring-network-airteltigo/20",
  },
};

const defaultMeta = {
  dot: "bg-primary",
  activeBg: "bg-primary/10",
  activeBorder: "border-primary/40",
  activeRing: "ring-primary/20",
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
              "relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-200",
              isActive
                ? `${m.activeBg} ${m.activeBorder} ring-2 ${m.activeRing} shadow-sm`
                : "bg-card border-border/50 hover:border-border hover:shadow-sm active:scale-[0.98]"
            )}
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-200",
                isActive ? `${m.dot} shadow-sm scale-110` : "bg-muted-foreground/25"
              )}
            />
            <span
              className={cn(
                "text-sm font-extrabold transition-colors duration-200",
                isActive ? "text-foreground" : "text-muted-foreground"
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
