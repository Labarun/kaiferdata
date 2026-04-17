/**
 * SubscriptionGate
 *
 * Premium pre-activation gate. Children render normally if subscription
 * is active. Otherwise children are blurred + non-interactive and a
 * centered "Activate subscription" CTA appears.
 *
 * Behavior:
 *   - mode="full"   → entire wrapped area is gated
 *   - mode="action" → small inline lock badge + paywall on click (used per-button)
 */
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionSnapshot } from "@/services/agentSubscriptionState";

interface SubscriptionGateProps {
  children: ReactNode;
  mode?: "full" | "action";
  /** Override the message shown in the paywall card. */
  message?: string;
}

export function SubscriptionGate({ children, mode = "full", message }: SubscriptionGateProps) {
  const { loading, isSubscriptionActive } = useSubscriptionSnapshot();

  if (loading || isSubscriptionActive) return <>{children}</>;

  if (mode === "action") {
    return (
      <div className="relative inline-flex">
        <div className="pointer-events-none opacity-60 blur-[1.5px]">{children}</div>
        <Link to="/agent/subscription" className="absolute inset-0 grid place-items-center">
          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-foreground/85 text-background flex items-center gap-1">
            <Lock className="h-3 w-3" /> Activate
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="max-w-sm w-full mx-4 rounded-2xl glass-elevated p-6 text-center">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">Activate your store to continue</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {message ?? "This area is unlocked once your subscription is active. Choose monthly or yearly to publish your store."}
          </p>
          <Button asChild className="mt-4 w-full">
            <Link to="/agent/subscription">View plans</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
