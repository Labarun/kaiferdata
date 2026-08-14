/**
 * AgentWhatsAppBanner — Dismissible WhatsApp channel banner for active agents.
 *
 * Flow:
 *  - Banner is always visible (pinned at top) until the agent confirms they joined.
 *  - Clicking X → confirmation popup (rendered via Portal at document.body):
 *      "Yes, I joined" → permanently hides the banner (localStorage flag).
 *      "Not yet"       → closes popup only; banner stays pinned.
 *  - Clicking "Join" → opens channel in new tab; banner stays until confirmed.
 *
 * The confirmation popup is rendered via ReactDOM.createPortal so it always
 * covers the full viewport regardless of parent overflow/transform context.
 *
 * Link: https://whatsapp.com/channel/0029Vb8nQCI42DcgnTUkP53Y
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";

const JOINED_KEY = "kaifer.agentWaBanner.joined";
const WA_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8nQCI42DcgnTUkP53Y";

function hasJoined(): boolean {
  try { return window.localStorage.getItem(JOINED_KEY) === "true"; } catch { return false; }
}
function markJoined() {
  try { window.localStorage.setItem(JOINED_KEY, "true"); } catch {}
}

interface AgentWhatsAppBannerProps {
  isActive: boolean;
}

export function AgentWhatsAppBanner({ isActive }: AgentWhatsAppBannerProps) {
  const [visible, setVisible] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (isActive && !hasJoined()) setVisible(true);
  }, [isActive]);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (confirmOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [confirmOpen]);

  const handleXClick = () => setConfirmOpen(true);

  const handleConfirmJoined = () => {
    markJoined();
    setConfirmOpen(false);
    setVisible(false);
  };

  const handleNotYet = () => setConfirmOpen(false);

  if (!visible) return null;

  const popup = confirmOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleNotYet(); }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="wa-confirm-title"
        >
          {/* Sheet / Modal card */}
          <div
            className="relative w-full sm:max-w-md overflow-hidden rounded-t-[28px] sm:rounded-[28px] border border-border/40 bg-card"
            style={{
              animation: "waConfirmIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: "0 -8px 48px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Ambient glow blobs */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
              <div className="absolute -top-20 -right-20 h-52 w-52 rounded-full bg-primary/12 blur-3xl" />
              <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[#25D366]/8 blur-3xl" />
            </div>

            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
              <div className="h-[5px] w-9 rounded-full bg-border/60" />
            </div>

            {/* Desktop close button */}
            <button
              type="button"
              onClick={handleNotYet}
              className="absolute right-4 top-4 z-10 hidden sm:flex items-center justify-center rounded-full border border-border/50 bg-background/70 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Content */}
            <div className="px-5 py-5 sm:px-7 sm:py-6">
              {/* Icon */}
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#25D366]/25 bg-[#25D366]/10">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>

              <h3
                id="wa-confirm-title"
                className="text-[18px] sm:text-[20px] font-bold leading-tight tracking-tight text-foreground"
              >
                Have you joined the WhatsApp channel?
              </h3>
              <p className="mt-2 text-[12.5px] sm:text-[13px] leading-relaxed text-muted-foreground/70">
                Join the agent updates channel to stay informed about pricing changes, news, and promos.
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleConfirmJoined}
                  className="w-full rounded-2xl bg-gradient-to-r from-primary to-info py-3.5 text-[14px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  ✓ &nbsp;Yes, I joined
                </button>

                <button
                  type="button"
                  onClick={handleNotYet}
                  className="w-full rounded-2xl border border-border/40 bg-muted/20 py-3.5 text-[14px] font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground active:scale-[0.98]"
                >
                  Not yet
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes waConfirmIn {
              from { opacity: 0; transform: translateY(24px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {/* ── Banner ── */}
      <div
        className="relative flex items-center gap-3 rounded-2xl border border-[#25D366]/25 bg-[#0a1a0f] px-4 py-3 shadow-lg shadow-[#25D366]/5 overflow-hidden"
        style={{ animation: "waBannerSlideIn 0.3s ease-out" }}
      >
        <div className="pointer-events-none absolute -top-8 -left-8 h-24 w-24 rounded-full bg-[#25D366]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-20 w-20 rounded-full bg-[#25D366]/8 blur-2xl" />

        {/* WhatsApp icon */}
        <div className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/15 border border-[#25D366]/20">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white leading-tight">Join Agent Updates Channel</p>
          <p className="text-[11px] text-[#25D366]/70 mt-0.5 leading-tight">Stay informed about agent news &amp; promos</p>
        </div>

        {/* Join CTA */}
        <a
          href={WA_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative shrink-0 flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-[12px] font-bold text-white shadow-md shadow-[#25D366]/30 transition-all hover:bg-[#22c55e] active:scale-95"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Join
        </a>

        {/* X → open confirmation */}
        <button
          type="button"
          onClick={handleXClick}
          className="shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:text-white/70 hover:bg-white/5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <style>{`
          @keyframes waBannerSlideIn {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* Confirmation popup mounted at document.body via portal */}
      {popup}
    </>
  );
}
