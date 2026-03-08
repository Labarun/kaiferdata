/**
 * Shared admin status badge component
 */
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  // Order statuses
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  submitting: "bg-amber-50 text-amber-700 border-amber-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
  // Payment statuses
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reversed: "bg-purple-50 text-purple-700 border-purple-200",
  // Intent statuses
  created: "bg-blue-50 text-blue-700 border-blue-200",
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  payment_processing: "bg-amber-50 text-amber-700 border-amber-200",
  payment_confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fulfilling: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

export function OperationsBadge({ status, className }: { status: string; className?: string }) {
  const colors = STATUS_COLORS[status] || "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize border",
        colors,
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
