/**
 * LoadingState — Premium liquid-glass loading primitives
 *
 * One source of truth for tasteful skeletons / shimmer / page transitions
 * across the logged-in experience. Replaces ugly generic spinners.
 *
 * Components:
 *   <PageLoader />      — Suspense fallback for route transitions
 *   <ListSkeleton />    — Stacked rows skeleton (orders, transactions)
 *   <DashboardSkeleton/>— Wallet hero + quick actions + list combo
 *   <Shimmer />         — Low-level shimmer block (custom layouts)
 */
import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
}

/** Low-level shimmer — uses theme-tinted muted bg with animated gradient sweep. */
export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/40 rounded-md",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.6s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent",
        "dark:before:via-white/10",
        className,
      )}
    />
  );
}

/** Suspense fallback used by App.tsx route boundaries. Stays minimal & premium. */
export function PageLoader() {
  return (
    <div
      className="min-h-[40vh] flex flex-col items-center justify-center gap-3 animate-fade-in"
      role="status"
      aria-label="Loading"
    >
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="relative h-9 w-9 rounded-full glass-elevated flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/55 font-medium">
        Loading
      </span>
    </div>
  );
}

interface ListSkeletonProps {
  rows?: number;
  /** When true, render as connected glass-card group (used inside divide-y containers). */
  connected?: boolean;
}

/** Stacked row skeletons — for order/transaction lists. */
export function ListSkeleton({ rows = 4, connected = false }: ListSkeletonProps) {
  if (connected) {
    return (
      <div className="divide-y divide-border/30" aria-hidden>
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeletonInner key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl">
          <RowSkeletonInner />
        </div>
      ))}
    </div>
  );
}

function RowSkeletonInner() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <Shimmer className="h-3.5 w-32 rounded-md" />
        <Shimmer className="h-2.5 w-24 rounded-md opacity-70" />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Shimmer className="h-3.5 w-16 rounded-md" />
        <Shimmer className="h-3 w-12 rounded-full opacity-70" />
      </div>
    </div>
  );
}

/** Combined dashboard hero + actions + list skeleton. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-hidden>
      <div className="space-y-2">
        <Shimmer className="h-3 w-20 rounded-md" />
        <Shimmer className="h-7 w-56 rounded-lg" />
        <Shimmer className="h-3 w-44 rounded-md opacity-70" />
      </div>
      <Shimmer className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Shimmer className="h-24 rounded-xl" />
        <Shimmer className="h-24 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Shimmer className="h-3 w-24 rounded-md mb-3" />
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}
