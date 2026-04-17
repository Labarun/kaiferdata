/**
 * AgentOnboardingHero — Premium "Become an agent" landing screen
 *
 * Shown when the user has no application yet. CTA starts a draft
 * via getOrCreateDraft() and routes them into the wizard.
 */
import { Button } from "@/components/ui/button";
import {
  Sparkles, TrendingUp, Store, Wallet, ShieldCheck, ArrowRight, Loader2,
  Tag, Share2, BarChart3,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDraft } from "@/services/agent";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onStarted: () => void;
  /** When true, the CTA reads "Resume application" and the existing draft is reused instead of creating a new one. */
  resumeMode?: boolean;
  /** Optional admin note to surface above the CTA (used in `needs_changes` flow). */
  adminNote?: string | null;
}

const BENEFITS = [
  {
    icon: Tag,
    title: "Set your own prices",
    desc: "Choose your selling price for every bundle and earn the markup on every sale.",
  },
  {
    icon: Store,
    title: "Your own storefront",
    desc: "A premium public store page at kaiferdata.com/store/yourname with your logo & brand.",
  },
  {
    icon: Wallet,
    title: "Earnings wallet",
    desc: "Profit from every sale lands in your dedicated earnings wallet — withdraw to MoMo.",
  },
  {
    icon: Share2,
    title: "Shareable store link",
    desc: "Send your link on WhatsApp & social. Customers buy directly from you.",
  },
  {
    icon: BarChart3,
    title: "Performance dashboard",
    desc: "Daily, weekly and monthly views of your sales, orders and customers.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted infrastructure",
    desc: "Same secure Paystack flow & supplier delivery as the main Kaiferdata platform.",
  },
];

const HOW = [
  "Apply in a few minutes",
  "Our team reviews your application",
  "Get approved within ~24 hours",
  "Activate your store",
  "Start selling and earning",
];

export function AgentOnboardingHero({ onStarted, resumeMode, adminNote }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!user) return;
    setStarting(true);
    try {
      // getOrCreateDraft is idempotent, so resume re-uses the same row.
      await getOrCreateDraft(user.id);
      onStarted();
    } catch (e: any) {
      setStarting(false);
      toast({ title: "Couldn't start application", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 pb-40 md:pb-32">
      {/* Hero */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary/60" />
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Kaiferdata Agent Program
          </p>
        </div>
        <h1 className="text-[26px] font-bold text-foreground tracking-tight leading-tight">
          Resell data.
          <br />
          <span className="text-gradient-brand">Build your business.</span>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed max-w-[340px]">
          Get reseller pricing, your own premium storefront, and earn profit
          on every bundle you sell — all powered by Kaiferdata.
        </p>
      </div>

      {/* Earnings illustration card */}
      <div className="glass-elevated rounded-2xl p-5 relative overflow-hidden animate-fade-in animate-stagger-1">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex items-start gap-3 relative z-[1]">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Build a real reseller business
            </p>
            <p className="text-[13px] text-foreground mt-1 leading-relaxed">
              Set your own prices, share your store, and earn the markup on every
              bundle you sell. Your subscription pays for itself fast.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits grid */}
      <div className="space-y-2.5 animate-fade-in animate-stagger-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1">
          What you get
        </p>
        {BENEFITS.map((b) => (
          <div key={b.title} className="glass-card rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <b.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{b.title}</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="glass-card rounded-2xl p-5 space-y-3 animate-fade-in animate-stagger-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          How it works
        </p>
        <ol className="space-y-2.5">
          {HOW.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-[13px] text-foreground">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Subscription notice */}
      <div className="glass-subtle rounded-xl p-4 text-center space-y-1 animate-fade-in animate-stagger-4">
        <p className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wider">
          Subscription after approval
        </p>
        <p className="text-[14px] text-foreground font-semibold">
          GH₵50 / month <span className="text-muted-foreground/50">·</span> GH₵400 / year
        </p>
        <p className="text-[10.5px] text-muted-foreground/55">Manual renewal · Cancel anytime</p>
      </div>

      {/* CTA — sticky, sits clear of the mobile bottom dock and safe area */}
      <div
        className="sticky z-30 pt-2 animate-fade-in animate-stagger-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
      >
        <Button
          className="w-full h-12 rounded-xl text-[14px] font-semibold gap-2 shadow-[0_8px_20px_-6px_hsl(213_73%_40%/0.45)]"
          disabled={starting}
          onClick={handleStart}
        >
          {starting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Preparing application…</>
          ) : (
            <>Start my application <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
