/**
 * NetworkSelector - Premium network choice tiles with brand accents
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

const networkConfig: Record<string, { bg: string; border: string; text: string; dot: string; activeBg: string }> = {
  MTN: {
    bg: "bg-network-mtn/8",
    border: "border-network-mtn/40",
    text: "text-foreground",
    dot: "bg-network-mtn",
    activeBg: "bg-network-mtn/15",
  },
  Telecel: {
    bg: "bg-network-telecel/8",
    border: "border-network-telecel/40",
    text: "text-foreground",
    dot: "bg-network-telecel",
    activeBg: "bg-network-telecel/15",
  },
  AirtelTigo: {
    bg: "bg-network-airteltigo/8",
    border: "border-network-airteltigo/40",
    text: "text-foreground",
    dot: "bg-network-airteltigo",
    activeBg: "bg-network-airteltigo/15",
  },
};

const defaultConfig = {
  bg: "bg-muted/50",
  border: "border-primary/40",
  text: "text-foreground",
  dot: "bg-primary",
  activeBg: "bg-primary/10",
};

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {networks.map((network) => {
        const isActive = selected === network;
        const config = networkConfig[network] || defaultConfig;

        return (
          <button
            key={network}
            type="button"
            onClick={() => onSelect(network)}
            className={cn(
              "relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all duration-200",
              isActive
                ? `${config.activeBg} ${config.border} shadow-sm scale-[1.02]`
                : `bg-card border-border/60 hover:border-border hover:shadow-sm hover:scale-[1.01]`
            )}
          >
            <div className={cn(
              "h-3 w-3 rounded-full transition-all duration-200",
              isActive ? `${config.dot} shadow-sm` : "bg-muted-foreground/20"
            )} />
            <span className={cn(
              "text-sm font-extrabold transition-colors",
              isActive ? config.text : "text-foreground"
            )}>
              {network}
            </span>
            {isActive && (
              <span className="text-[10px] font-semibold text-primary">Selected</span>
            )}
          </button>
        );
      })}
    </div>
  );
}