/**
 * SpecialStatusBadge — status pill for special bundle orders.
 */
import { cn } from "@/lib/utils";
import { SPECIAL_STATUS_META, type SpecialOrderStatus } from "@/services/specialBundles";

export function SpecialStatusBadge({
  status,
  className,
}: {
  status: SpecialOrderStatus | string;
  className?: string;
}) {
  const meta = SPECIAL_STATUS_META[status as SpecialOrderStatus] || SPECIAL_STATUS_META.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border",
        meta.tone,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
