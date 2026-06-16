/**
 * AdminFilterBar — search + status chips + optional advanced filters (collapsible).
 * Mobile-first: chips scroll horizontally, advanced filters tuck into a panel.
 */
import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipGroup {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}

export function AdminFilterBar({
  search,
  onSearchChange,
  onSubmit,
  placeholder = "Search…",
  chips = [],
  advanced,
  rightSlot,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  chips?: ChipGroup[];
  advanced?: ReactNode;
  rightSlot?: ReactNode;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
            className="pl-9 h-10 text-sm"
          />
        </div>
        {advanced && (
          <Button variant="outline" size="sm" className="h-10 gap-1.5" onClick={() => setShowAdvanced((v) => !v)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </Button>
        )}
        {rightSlot}
      </div>

      {chips.length > 0 && (
        <div className="space-y-1.5">
          {chips.map((group, gi) => (
            <div key={gi} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {group.label && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold shrink-0 mr-1">
                  {group.label}
                </span>
              )}
              {group.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => group.onChange(opt.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors capitalize whitespace-nowrap shrink-0",
                    group.value === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted/50",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {advanced && showAdvanced && (
        <div className="rounded-lg border bg-muted/20 p-3">{advanced}</div>
      )}
    </div>
  );
}
