/**
 * SpecialOfferPromo — eye-catching banner advertising the special bundle offer.
 * Used on the user and agent dashboards. `to` points at the panel-scoped path.
 */
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

export function SpecialOfferPromo({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="block relative overflow-hidden rounded-2xl p-4 group animate-fade-in animate-stagger-2
                 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20
                 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 bg-primary/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
      <div className="relative flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-foreground">MTN Special Bundles</p>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              New
            </span>
          </div>
          <p className="text-[11.5px] text-muted-foreground truncate">
            Cheaper MTN data, paid from your wallet · tap to view
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
