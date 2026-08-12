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
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Store, Wallet, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAgentState } from "@/services/agent";

const STORAGE_KEY = "kaifer.agentPromo.v1";
const SESSION_KEY = "kaifer.session.promo"; // Tab-level memory for hard reloads
const DAY_MS = 24 * 60 * 60 * 1000;

type StoredState = {
  dismissedAt?: number;
  ctaAt?: number;
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
  const [destroyed, setDestroyed] = useState(false);

  useEffect(() => {
    if (loading || destroyed) return;
    
    // Hard-lock: If we've shown it in this browser tab, never show it again
    // This survives page reloads (F5) unlike JS variables!
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // ignore
    }
    
    let cancelled = false;
    let timeoutId: any;

    (async () => {
      const state = readState();
      const now = Date.now();

      if (user) {
        if (user.role === "agent" || user.role === "admin" || user.role === "staff") return;
        if (state.shownForUserId === user.id) return;
        try {
          const agentState = await resolveAgentState(user.id);
          if (agentState.kind !== "no_application") return;
        } catch {
          return;
        }
      } else {
        if (state.ctaAt && now - state.ctaAt < 7 * DAY_MS) return;
        if (state.dismissedAt && now - state.dismissedAt < DAY_MS) return;
      }

      if (!cancelled) {
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            try {
              window.sessionStorage.setItem(SESSION_KEY, "true");
            } catch {}
            setOpen(true);
          }
        }, 1400);
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, loading, destroyed]);

  const forceClose = () => {
    const s = readState();
    if (user) {
      writeState({ ...s, shownForUserId: user.id });
    } else {
      writeState({ ...s, dismissedAt: Date.now() });
    }
    setOpen(false);
    // Hard unmount from React tree after exit animation
    setTimeout(() => setDestroyed(true), 300);
  };

  const handleCta = (e: React.MouseEvent) => {
    e.preventDefault();
    const s = readState();
    if (user) {
      writeState({ ...s, shownForUserId: user.id });
      setOpen(false);
      setTimeout(() => setDestroyed(true), 300);
      navigate("/dashboard/become-agent");
    } else {
      writeState({ ...s, ctaAt: Date.now() });
      setOpen(false);
      setTimeout(() => setDestroyed(true), 300);
      navigate("/register?intent=agent");
    }
  };

  // If destroyed, physically remove it from the DOM
  if (destroyed) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) forceClose();
    }}>
      <DialogContent className="max-w-[340px] sm:max-w-[360px] p-0 overflow-hidden border-border/40 glass-premium rounded-3xl [&>button]:hidden">
        
        {/* Raw button bypasses Radix UI event interceptions */}
        <button 
          className="absolute right-3 top-3 z-50 rounded-full bg-background/50 p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-all backdrop-blur-md border border-border/50"
          onClick={forceClose}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Close</span>
        </button>

        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-info/10 blur-3xl pointer-events-none" />
        </div>

        <div className="relative z-10 p-5 sm:p-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            <span className="text-[9px] font-bold text-primary tracking-wider uppercase">New</span>
          </div>

          <DialogTitle className="text-[18px] sm:text-[20px] font-bold tracking-tight leading-tight text-foreground">
            Become a Kaiferdata Agent
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground/80 mt-1.5 leading-relaxed">
            Get cheaper prices, set your own store rates, and earn profit on every order.
          </DialogDescription>

          {/* Benefits */}
          <div className="mt-4 space-y-2">
            {[
              { icon: TrendingUp, label: "Cheaper agent pricing", sub: "Buy below public rates" },
              { icon: Store, label: "Your own data store", sub: "Branded link you can share" },
              { icon: Wallet, label: "Earn on every sale", sub: "Profit credited automatically" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2.5 p-2 rounded-xl glass-subtle border border-border/40">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground leading-tight">{b.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            onClick={handleCta}
            className="w-full mt-5 h-10 rounded-xl text-[13px] font-semibold bg-gradient-to-r from-primary to-info hover:opacity-95 shadow-lg shadow-primary/20"
          >
            {user ? "Start Application" : "Become an Agent"}
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>

          {/* Raw button for maybe later bypasses DialogClose bugs */}
          <button
            type="button"
            onClick={forceClose}
            className="w-full mt-1.5 h-8 text-[11px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
