import { TrendingUp, Clock, CalendarDays } from "lucide-react";

export function EarningsPotential() {
  return (
    <div className="mb-6 animate-fade-in glass-card p-4 sm:p-5 rounded-2xl border-primary/10">
      <div className="text-center mb-5 space-y-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500">
          Earnings Potential
        </p>
        <h3 className="text-lg font-bold text-foreground">How much can you actually make?</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Realistic numbers based on average margins — and you set your own markup.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tier 1 */}
        <div className="glass-card rounded-xl p-3.5 border border-border/50 flex flex-col justify-between transition-transform hover:-translate-y-1">
          <div>
            <h4 className="text-[14px] font-bold text-foreground">5 sales/day</h4>
            <p className="text-[11px] text-muted-foreground">Side hustle</p>
          </div>
          <div className="mt-4 space-y-2.5 text-[11px]">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Per sale</span>
              <span className="font-semibold text-foreground">GHS 1.50</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Per day</span>
              <span className="font-semibold text-foreground">GHS 7.50</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground pt-2 border-t border-border/50">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Per month</span>
              <span className="font-bold text-amber-500">GHS 225</span>
            </div>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="glass-card rounded-xl p-3.5 border-2 border-amber-500/40 bg-amber-500/5 relative flex flex-col justify-between transition-transform hover:-translate-y-1">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
            <TrendingUp className="h-3 w-3" /> Most Agents
          </div>
          <div className="pt-2">
            <h4 className="text-[14px] font-bold text-foreground">15 sales/day</h4>
            <p className="text-[11px] text-muted-foreground">Part-time</p>
          </div>
          <div className="mt-4 space-y-2.5 text-[11px]">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Per sale</span>
              <span className="font-semibold text-foreground">GHS 1.80</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Per day</span>
              <span className="font-semibold text-foreground">GHS 27</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground pt-2 border-t border-amber-500/20">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Per month</span>
              <span className="font-bold text-amber-500">GHS 810</span>
            </div>
          </div>
        </div>

        {/* Tier 3 */}
        <div className="glass-card rounded-xl p-3.5 border border-border/50 flex flex-col justify-between transition-transform hover:-translate-y-1">
          <div>
            <h4 className="text-[14px] font-bold text-foreground">30 sales/day</h4>
            <p className="text-[11px] text-muted-foreground">Full-time</p>
          </div>
          <div className="mt-4 space-y-2.5 text-[11px]">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Per sale</span>
              <span className="font-semibold text-foreground">GHS 2.10</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Per day</span>
              <span className="font-semibold text-foreground">GHS 63</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground pt-2 border-t border-border/50">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Per month</span>
              <span className="font-bold text-amber-500">GHS 1,890</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center mt-4">
        Examples assume a modest markup per bundle. Set higher markups or run promotions and earnings go up.
      </p>
    </div>
  );
}
