/**
 * Horizontal pill-row range filter used by the agent dashboard
 * and any other analytics view that supports time windowing.
 */
import type { AnalyticsRange } from "@/services/agentAnalytics";

const OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "60d", label: "60 Days" },
  { value: "all", label: "All" },
];

interface Props {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}

export function AnalyticsRangeFilter({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
