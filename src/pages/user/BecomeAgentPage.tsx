/**
 * BecomeAgentPage — Phase 2 state router for the agent onboarding flow.
 *
 * Resolves the current AgentState via services/agent.resolveAgentState() and
 * renders the appropriate screen:
 *   - no_application                  → AgentOnboardingHero
 *   - draft / needs_changes           → AgentApplicationWizard
 *   - submitted / under_review        → AgentApplicationStatus (waiting)
 *   - declined                        → AgentApplicationStatus (declined)
 *   - approved_pending_subscription   → AgentApplicationStatus (CTA → subscription)
 *   - active                          → redirect to /agent
 *   - subscription_expired/suspended  → AgentApplicationStatus variants
 *
 * Strict additive: this only reads; it never mutates payment / wallet rows.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAgentState, type AgentState } from "@/services/agent";
import { AgentOnboardingHero } from "@/components/agent/AgentOnboardingHero";
import { AgentApplicationWizard } from "@/components/agent/AgentApplicationWizard";
import { AgentApplicationStatus } from "@/components/agent/AgentApplicationStatus";
import { PageLoader } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function BecomeAgentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const s = await resolveAgentState(user.id);
      setState(s);
      // If already an active agent, send them straight to the agent dashboard.
      if (s.kind === "active") navigate("/agent", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading || !state) return <PageLoader />;

  switch (state.kind) {
    case "no_application":
      return <AgentOnboardingHero onStarted={refresh} />;

    case "draft":
    case "needs_changes":
      return (
        <AgentApplicationWizard
          application={state.application}
          onSubmitted={refresh}
        />
      );

    case "submitted":
      return <AgentApplicationStatus application={state.application} variant="submitted" />;

    case "under_review":
      return <AgentApplicationStatus application={state.application} variant="under_review" />;

    case "declined":
      return <AgentApplicationStatus application={state.application} variant="declined" />;

    case "approved_pending_subscription":
      return (
        <AgentApplicationStatus
          application={state.application}
          profile={state.profile}
          variant="approved_pending_subscription"
        />
      );

    case "subscription_expired":
      return (
        <div className="space-y-5 pb-4 animate-fade-in">
          <div className="glass-elevated rounded-2xl p-5 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Subscription expired</p>
              <p className="text-[12px] text-muted-foreground/80 mt-1 max-w-[280px] mx-auto leading-relaxed">
                Your agent subscription has lapsed. Renew it to reactivate your storefront and reseller pricing.
              </p>
            </div>
            <Button asChild className="w-full h-11 rounded-xl gap-2">
              <Link to="/agent/subscription">Renew subscription <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      );

    case "suspended":
      return (
        <div className="space-y-5 pb-4 animate-fade-in">
          <div className="glass-elevated rounded-2xl p-5 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Account suspended</p>
              <p className="text-[12px] text-muted-foreground/80 mt-1 max-w-[300px] mx-auto leading-relaxed">
                {state.profile.suspension_reason ||
                  "Your agent account has been suspended. Please contact support for more information."}
              </p>
            </div>
          </div>
        </div>
      );

    case "active":
      // Handled by the navigate() above; render nothing while redirecting.
      return null;
  }
}
