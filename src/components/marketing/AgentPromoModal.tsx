/**
 * AgentPromoModal — Premium landing-page popup that promotes the Agent program.
 *
 * Smart display rules:
 *  - GUESTS: shows once per session (sessionStorage) + once per day (localStorage).
 *    If dismissed → silenced for 24h. If CTA clicked → silenced for 7 days.
 *  - LOGGED-IN USERS (regular `user` role only): shows AT MOST once, ever.
 *  - AGENTS / APPLICANTS / APPROVED / ADMIN / STAFF: never shown.
 *
 * NOTE: Uses a plain custom overlay instead of Radix Dialog to avoid
 * Radix event-interception and [&>button]:hidden CSS conflicts that were
 * preventing the close buttons from working.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Store, Wallet, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAgentState } from "@/services/agent";

const STORAGE_KEY = "kaifer.agentPromo.v1";
const SESSION_KEY = "kaifer.session.promo";
const DAY_MS = 24 * 60 * 60 * 1000;

type StoredState = {
  dismissedAt?: number;
  ctaAt?: number;
  shownForUserId?: string;
};

function readState(): StoredState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(s: StoredState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function isSessionLocked(): boolean {
  try { return window.sessionStorage.getItem(SESSION_KEY) === "true"; } catch { return false; }
}

function lockSession() {
  try { window.sessionStorage.setItem(SESSION_KEY, "true"); } catch {}
}

function unlockSession() {
  try { window.sessionStorage.removeItem(SESSION_KEY); } catch {}
}

export function AgentPromoModal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;

    // ── SYNCHRONOUS GUARD: check before any async/timeout work ─────────────
    // sessionStorage survives F5 reloads within the same tab.
    if (isSessionLocked()) return;

    const state = readState();
    const now = Date.now();

    // Guest dismissal checks (synchronous)
    if (!user) {
      if (state.ctaAt && now - state.ctaAt < 7 * DAY_MS) return;
      if (state.dismissedAt && now - state.dismissedAt < DAY_MS) return;
    }

    // Logged-in role / already-shown checks (synchronous)
    if (user) {
      if (user.role === "agent" || user.role === "admin" || user.role === "staff") return;
      if (state.shownForUserId === user.id) return;
    }

    // ── Lock NOW — before any async work so concurrent re-runs are blocked ──
    lockSession();

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    (async () => {
      if (user) {
        try {
          const agentState = await resolveAgentState(user.id);
          if (agentState.kind !== "no_application") {
            unlockSession(); // won't show — release lock
            return;
          }
        } catch {
          unlockSession();
          return;
        }
      }

      if (!cancelled) {
        timeoutId = setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 1400);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const dismiss = () => {
    const s = readState();
    if (user) {
      writeState({ ...s, shownForUserId: user.id });
    } else {
      writeState({ ...s, dismissedAt: Date.now() });
    }
    setVisible(false);
  };

  const handleCta = () => {
    const s = readState();
    if (user) {
      writeState({ ...s, shownForUserId: user.id });
      setVisible(false);
      navigate("/dashboard/become-agent");
    } else {
      writeState({ ...s, ctaAt: Date.now() });
      setVisible(false);
      navigate("/register?intent=agent");
    }
  };

  if (!visible) return null;

  return (
    // Full-screen overlay — no Radix UI involved, we own every event
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="agent-promo-title"
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-[340px] overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl shadow-black/40"
        style={{ animation: "agentPromoFadeIn 0.22s ease-out" }}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-info/10 blur-3xl" />
        </div>

        {/* X Close button — plain <button>, no Radix */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-full border border-border/50 bg-background/60 p-1.5 text-muted-foreground backdrop-blur-md transition-colors hover:bg-background hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Content */}
        <div className="p-5 sm:p-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary">New</span>
          </div>

          <h2
            id="agent-promo-title"
            className="text-[18px] font-bold leading-tight tracking-tight text-foreground sm:text-[20px]"
          >
            Become a Kaiferdata Agent
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/80">
            Get cheaper prices, set your own store rates, and earn profit on every order.
          </p>

          <div className="mt-4 space-y-2">
            {[
              { icon: TrendingUp, label: "Cheaper agent pricing", sub: "Buy below public rates" },
              { icon: Store, label: "Your own data store", sub: "Branded link you can share" },
              { icon: Wallet, label: "Earn on every sale", sub: "Profit credited automatically" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <b.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold leading-tight text-foreground">{b.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Become an Agent CTA — plain <button> */}
          <button
            type="button"
            onClick={handleCta}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-info py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            {user ? "Start Application" : "Become an Agent"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          {/* Maybe later — plain <button> */}
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground/80"
          >
            Maybe later
          </button>
        </div>
      </div>

      <style>{`
        @keyframes agentPromoFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
