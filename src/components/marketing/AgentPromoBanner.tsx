/**
 * AgentPromoBanner — Dashboard-level promotional popup for logged-in users.
 *
 * Display rules:
 *  - Only shown to users with role "user" (not agent, admin, staff).
 *  - Only shown once ever (persisted in localStorage per user ID).
 *  - Uses sessionStorage as an additional tab-level guard.
 *  - Appears 1.8s after the dashboard loads (non-jarring entry).
 *  - Links to /dashboard/become-agent for the application.
 *
 * Uses a plain custom overlay (no Radix Dialog) for reliable close behaviour.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, Store, Wallet, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAgentState } from "@/services/agent";

const STORAGE_KEY = "kaifer.agentPromoBanner.v1";
const SESSION_KEY = "kaifer.session.promoBanner";

type StoredState = {
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

export function AgentPromoBanner() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    // Only for regular users
    if (user.role !== "user") return;

    // Tab-level guard — survives F5 reloads
    if (isSessionLocked()) return;

    // Already dismissed permanently for this user?
    const state = readState();
    if (state.shownForUserId === user.id) return;

    // Lock immediately before any async work
    lockSession();

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        const agentState = await resolveAgentState(user.id);
        if (agentState.kind !== "no_application") {
          unlockSession(); // user already applied — don't show
          return;
        }
      } catch {
        unlockSession();
        return;
      }

      if (!cancelled) {
        timeoutId = setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 1800);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const dismiss = () => {
    if (user) writeState({ shownForUserId: user.id });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    // Full-screen overlay — plain div, no Radix UI
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="agent-banner-title"
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-[340px] overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl shadow-black/40"
        style={{ animation: "agentBannerFadeIn 0.22s ease-out" }}
      >
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-info/10 blur-3xl" />
        </div>

        {/* X close button */}
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
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Opportunity</span>
          </div>

          <h2
            id="agent-banner-title"
            className="text-[18px] font-bold leading-tight tracking-tight text-foreground sm:text-[20px]"
          >
            Become a Kaiferdata Agent
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/80">
            You're already a customer — take the next step. Get wholesale prices, your own storefront, and earn on every sale.
          </p>

          <div className="mt-4 space-y-2">
            {[
              { icon: TrendingUp, label: "Wholesale agent pricing", sub: "Buy well below public rates" },
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

          {/* CTA — Link to agent application page */}
          <Link
            to="/dashboard/become-agent"
            onClick={dismiss}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-info py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            Start My Application
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {/* Maybe later */}
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
        @keyframes agentBannerFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
