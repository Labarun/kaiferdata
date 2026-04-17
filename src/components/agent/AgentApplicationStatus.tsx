/**
 * AgentApplicationStatus — Submitted / under_review / declined / approved-pending-sub
 *
 * Visual timeline showing where the application is, plus the admin's note
 * (when present) and the next-step CTA.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight, ShieldCheck, CreditCard,
} from "lucide-react";
import type { AgentApplication, AgentProfile } from "@/services/agent";
import { cn } from "@/lib/utils";

interface Props {
  application: AgentApplication | null;
  profile?: AgentProfile | null;
  /** When kind === "approved_pending_subscription" we show a CTA → /agent/subscription. */
  variant: "submitted" | "under_review" | "declined" | "approved_pending_subscription";
}

const COPY = {
  submitted: {
    title: "Application received",
    desc: "Thanks! Your application is in our review queue. We'll get back to you within 24-48 hours.",
    icon: Clock,
    tone: "primary" as const,
  },
  under_review: {
    title: "Under review",
    desc: "An admin is reviewing your application now. You'll be notified as soon as a decision is made.",
    icon: Clock,
    tone: "primary" as const,
  },
  declined: {
    title: "Application declined",
    desc: "Unfortunately we weren't able to approve your application. See the note below for more details.",
    icon: XCircle,
    tone: "destructive" as const,
  },
  approved_pending_subscription: {
    title: "You're approved! 🎉",
    desc: "One last step — choose a subscription plan to activate your agent storefront and start selling.",
    icon: CheckCircle2,
    tone: "success" as const,
  },
};

const TIMELINE = [
  { key: "submitted",   label: "Submitted" },
  { key: "review",      label: "Under review" },
  { key: "decision",    label: "Decision" },
  { key: "subscribe",   label: "Subscribe" },
  { key: "active",      label: "Active" },
];

function activeUpTo(variant: Props["variant"]): number {
  switch (variant) {
    case "submitted":                       return 0;
    case "under_review":                    return 1;
    case "declined":                        return 2;
    case "approved_pending_subscription":   return 3;
  }
}

export function AgentApplicationStatus({ application, profile, variant }: Props) {
  const copy = COPY[variant];
  const Icon = copy.icon;
  const lastActiveIdx = activeUpTo(variant);

  return (
    <div className="space-y-6 pb-4">
      {/* Hero */}
      <div className="animate-fade-in text-center">
        <div className={cn(
          "h-16 w-16 rounded-2xl mx-auto flex items-center justify-center mb-4",
          copy.tone === "primary" && "glass-premium",
          copy.tone === "success" && "bg-success/10 ring-2 ring-success/20",
          copy.tone === "destructive" && "bg-destructive/10 ring-2 ring-destructive/20",
        )}>
          <Icon className={cn(
            "h-7 w-7",
            copy.tone === "primary" && "text-primary",
            copy.tone === "success" && "text-success",
            copy.tone === "destructive" && "text-destructive",
          )} />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{copy.title}</h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[320px] mx-auto leading-relaxed">
          {copy.desc}
        </p>
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-2xl p-5 animate-fade-in animate-stagger-1">
        <div className="flex items-center justify-between gap-1">
          {TIMELINE.map((step, i) => {
            const done = i <= lastActiveIdx;
            const isFailedDecision = variant === "declined" && i === 2;
            return (
              <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                  isFailedDecision && "bg-destructive/15 text-destructive",
                  !isFailedDecision && done && "bg-primary text-primary-foreground",
                  !done && "bg-muted text-muted-foreground/40",
                )}>
                  {isFailedDecision
                    ? <XCircle className="h-3.5 w-3.5" />
                    : done
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <span className="text-[10px] font-semibold">{i + 1}</span>}
                </div>
                <p className={cn(
                  "text-[9.5px] font-medium uppercase tracking-wider text-center leading-tight",
                  done && !isFailedDecision && "text-primary",
                  isFailedDecision && "text-destructive",
                  !done && "text-muted-foreground/50",
                )}>{step.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin note */}
      {application?.admin_note && (variant === "declined") && (
        <div className="glass-card rounded-xl p-4 border-l-4 border-destructive animate-fade-in animate-stagger-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-foreground">Admin note</p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{application.admin_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* CTAs */}
      {variant === "approved_pending_subscription" && (
        <Link to="/dashboard/become-agent/subscribe" className="block animate-fade-in animate-stagger-2">
          <Button className="w-full h-12 rounded-xl gap-2">
            <CreditCard className="h-4 w-4" />
            Choose a subscription plan
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </Link>
      )}

      {/* Submitted summary */}
      {application && (
        <div className="glass-subtle rounded-xl p-4 space-y-2 animate-fade-in animate-stagger-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Submitted details</p>
          <SummaryRow label="Store name" value={application.store_name || profile?.store_name || "—"} />
          <SummaryRow label="Store URL"  value={application.store_slug ? `/store/${application.store_slug}` : "—"} />
          <SummaryRow label="Phone"      value={application.phone || "—"} />
          <SummaryRow label="City"       value={application.city || "—"} />
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/55 font-medium">
        <ShieldCheck className="h-3 w-3 text-success/55" />
        Your information is encrypted and only visible to admins.
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="font-medium text-foreground/85 truncate ml-3 max-w-[60%]">{value}</span>
    </div>
  );
}
