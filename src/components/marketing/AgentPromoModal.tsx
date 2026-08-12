/**
 * AgentPromoModal — Premium landing-page popup that promotes the Agent program.
 *
 * Smart display rules:
 *  - GUESTS: shows once per day. If "X" is closed → silenced for 24h.
 *    If CTA clicked → silenced for 7 days.
 *  - LOGGED-IN USERS (regular `user` role only): shows AT MOST once, ever.
 *  - AGENTS / APPLICANTS / APPROVED: never shown.
 *
 * State stored in localStorage under `kaifer.agentPromo.v1`.
 * Backend agent state is checked via resolveAgentState() for logged-in users.
 */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Store, Wallet, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAgentState } from "@/services/agent";

const STORAGE_KEY = "kaifer.agentPromo.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

type StoredState = {
  /** Timestamp when modal was last dismissed via X */
  dismissedAt?: number;
  /** Timestamp when CTA was clicked */
  ctaAt?: number;
  /** Whether we've shown it to this logged-in user already */
  shownForUserId?: string;
};

function readState(): StoredState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(s: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function AgentPromoModal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    let timeoutId: any;

    (async () => {
      const state = readState();
      const now = Date.now();

      if (user) {
        // Logged-in: check role + agent state
        if (user.role === "agent" || user.role === "admin" || user.role === "staff") return;
        // Already shown to this user once?
        if (state.shownForUserId === user.id) return;
        try {
          const agentState = await resolveAgentState(user.id);
          // Skip if any application/profile already exists
          if (agentState.kind !== "no_application") return;
        } catch {
          return;
        }
      } else {
        // Guest rules
        if (state.ctaAt && now - state.ctaAt < 7 * DAY_MS) return;
        if (state.dismissedAt && now - state.dismissedAt < DAY_MS) return;
      }

      if (!cancelled) {
        // Small delay so it doesn't feel jarring
        timeoutId = setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 1400);
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, loading]);

  const handleClose = (next: boolean) => {
    if (!next && open) {
      const s = readState();
      if (user) {
        writeState({ ...s, shownForUserId: user.id });
      } else {
        writeState({ ...s, dismissedAt: Date.now() });
      }
    }
    setOpen(next);
  };

  const handleCta = () => {
    const s = readState();
    if (user) {
      writeState({ ...s, shownForUserId: user.id });
      setOpen(false);
      navigate("/dashboard/become-agent");
    } else {
      writeState({ ...s, ctaAt: Date.now() });
      setOpen(false);
      navigate("/register?intent=agent");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden border-border/40 glass-premium rounded-3xl">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-info/10 blur-3xl pointer-events-none" />
        </div>

        <div className="relative z-10 p-6 sm:p-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">New</span>
          </div>

          <DialogTitle className="text-[22px] font-bold tracking-tight leading-tight text-foreground">
            Become a Kaiferdata Agent
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground/80 mt-1.5 leading-relaxed">
            Get cheaper prices, set your own store rates, and earn profit on every order.
          </DialogDescription>

          {/* Benefits */}
          <div className="mt-5 space-y-2.5">
            {[
              { icon: TrendingUp, label: "Cheaper agent pricing", sub: "Buy below public rates" },
              { icon: Store, label: "Your own data store", sub: "Branded link you can share" },
              { icon: Wallet, label: "Earn on every sale", sub: "Profit credited automatically" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-3 p-2.5 rounded-2xl glass-subtle border border-border/40">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            asChild
            className="w-full mt-6 h-12 rounded-2xl text-[14px] font-semibold bg-gradient-to-r from-primary to-info hover:opacity-95 shadow-lg shadow-primary/20"
          >
            <Link
              to={user ? "/dashboard/become-agent" : "/register?intent=agent"}
              onClick={() => {
                const s = readState();
                if (user) {
                  writeState({ ...s, shownForUserId: user.id });
                } else {
                  writeState({ ...s, ctaAt: Date.now() });
                }
                setOpen(false);
              }}
            >
              {user ? "Start Application" : "Become an Agent"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="w-full mt-2 h-9 text-[11.5px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
