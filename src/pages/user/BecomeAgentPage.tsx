/**
 * BecomeAgentPage — Phase 1 placeholder shown when a non-agent taps the Agent
 * tab in the bottom dock. Real onboarding flow ships in Phase 2.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, Wallet, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "Lower agent prices",
    desc: "Buy bundles at reseller pricing and set your own margin.",
  },
  {
    icon: Store,
    title: "Your own storefront",
    desc: "A premium public store page with your brand, logo and link.",
  },
  {
    icon: Wallet,
    title: "Profit tracking",
    desc: "Every sale credits your earnings wallet automatically.",
  },
];

export default function BecomeAgentPage() {
  return (
    <div className="space-y-6 pb-4">
      {/* Hero */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary/60" />
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Become a Kaiferdata Agent
          </p>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Resell data. Build your business.
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Join the Kaiferdata agent program — get reseller pricing, your own
          storefront, and earn on every sale.
        </p>
      </div>

      {/* Benefit cards */}
      <div className="grid gap-3 animate-fade-in animate-stagger-1">
        {benefits.map((b) => (
          <div key={b.title} className="glass-card rounded-xl p-4 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <b.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{b.title}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon notice */}
      <div className="glass-elevated rounded-2xl p-5 text-center space-y-3 animate-fade-in animate-stagger-2">
        <div className="h-12 w-12 rounded-2xl glass-premium flex items-center justify-center mx-auto">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Applications opening soon</p>
          <p className="text-[12px] text-muted-foreground/70 mt-1 max-w-[280px] mx-auto leading-relaxed">
            We're polishing the application and approval flow. You'll be able
            to apply directly from this page in the next update.
          </p>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/55 font-medium">
          <ShieldCheck className="h-3 w-3 text-success/55" />
          Subscription: GH₵50/month or GH₵400/year after approval
        </div>
      </div>

      {/* CTA back to dashboard */}
      <Link to="/dashboard" className="block animate-fade-in animate-stagger-3">
        <Button variant="outline" className="w-full h-11 rounded-xl glass-card border-primary/20 gap-2">
          Back to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
