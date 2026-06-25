/**
 * ServicePaused — premium "we're briefly paused" state for GUESTS.
 *
 * Shown on the public buy page when ordering is turned off (or a network has no
 * bundles available). Instead of a dead/empty screen, it reassures the visitor
 * that it's temporary and converts them hard to the WhatsApp channel so we can
 * pull them back the moment we reopen (often with cheaper prices).
 */
import { Clock, Sparkles, Tag, BadgeCheck, Bell } from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbCn7xiKbYMWspFUrd2r";

/** Inline WhatsApp glyph (lucide has no brand icon). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.99-1.107zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export function ServicePaused({
  variant = "global",
  network,
}: {
  variant?: "global" | "network";
  network?: string;
}) {
  const heading =
    variant === "network" && network
      ? `${network} bundles are paused right now`
      : "We'll be right back";

  return (
    <div className="animate-fade-in">
      <div className="relative overflow-hidden rounded-[2rem] glass-premium p-6 sm:p-8 text-center shimmer-edge">
        {/* warm ambient glow — temporary, not "dead" */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-40 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Pulsing pause badge */}
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl glass-elevated flex items-center justify-center">
            <span className="relative flex h-9 w-9 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/30 animate-ping" />
              <Clock className="relative h-7 w-7 text-amber-500" />
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-semibold mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Paused — back very soon
          </span>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{heading}</h2>
          <p className="mt-2 text-[13.5px] text-muted-foreground/80 leading-relaxed max-w-sm mx-auto">
            We've briefly paused orders to restock and come back even stronger — usually back within a short while,
            often with <span className="font-semibold text-foreground">even cheaper prices</span>. 🇬🇭
          </p>

          {/* The hook — join the channel */}
          <div className="mt-6 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/[0.06] p-4 sm:p-5">
            <p className="text-[13px] font-semibold text-foreground flex items-center justify-center gap-1.5">
              <Bell className="h-4 w-4 text-[#25D366]" /> Don't miss the reopen
            </p>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Join our WhatsApp channel and we'll ping you the second we're back — with first access to the cheaper deals.
            </p>
            <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer" className="block mt-3.5">
              <button className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#1fb855] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#25D366]/20 active:scale-[0.98]">
                <WhatsAppIcon className="h-5 w-5" /> Join our WhatsApp channel
              </button>
            </a>
          </div>

          {/* Reassurance chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/70">
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /> Restoring soon</span>
            <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3 text-success" /> Cheaper prices coming</span>
            <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3 w-3 text-primary" /> Same trusted delivery</span>
          </div>

          <p className="mt-5 text-[11px] text-muted-foreground/55">
            Already ordered?{" "}
            <Link to="/track" className="text-primary font-medium hover:underline">Track your order</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
