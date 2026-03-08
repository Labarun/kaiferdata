/**
 * NetworkSelector - Visually clean network selection component
 */
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selected: string | null;
  onSelect: (network: string) => void;
}

// Network brand colors (using semantic tokens where possible)
const networkStyles: Record<string, { bg: string; ring: string; text: string }> = {
  MTN: { bg: "bg-warning/10", ring: "ring-warning/40", text: "text-warning" },
  Airtel: { bg: "bg-destructive/10", ring: "ring-destructive/40", text: "text-destructive" },
  Glo: { bg: "bg-success/10", ring: "ring-success/40", text: "text-success" },
  "9mobile": { bg: "bg-primary/10", ring: "ring-primary/40", text: "text-primary" },
};

const defaultStyle = { bg: "bg-muted", ring: "ring-primary/40", text: "text-foreground" };

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {networks.map((network) => {
        const isActive = selected === network;
        const style = networkStyles[network] || defaultStyle;

        return (
          <button
            key={network}
            type="button"
            onClick={() => onSelect(network)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 transition-all duration-150",
              isActive
                ? `${style.bg} border-current ${style.text} ring-2 ${style.ring} shadow-sm`
                : "bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/50"
            )}
          >
            <span className={cn(
              "text-sm font-bold",
              isActive ? style.text : "text-foreground"
            )}>
              {network}
            </span>
            {isActive && (
              <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-current" />
            )}
          </button>
        );
      })}
    </div>
  );
}
