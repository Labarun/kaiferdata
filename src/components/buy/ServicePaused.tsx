/**
 * ServicePaused — premium "we're briefly paused" state for GUESTS and USERS.
 *
 * Shown on the public and user buy page when ordering is turned off (or a network has no
 * bundles available). Instead of a dead/empty screen, it reassures the visitor
 * that it's temporary and converts them hard to the WhatsApp channel so we can
 * pull them back the moment we reopen (often with cheaper prices).
 */
import { Clock, Tag } from "lucide-react";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbCn7xiKbYMWspFUrd2r";

/** Inline WhatsApp glyph (lucide has no brand icon). */
function WhatsAppIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
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
      ? `${network} data is taking a short break`
      : "Our ordering service is taking a short break";

  return (
    <div className="animate-fade-in w-full">
      <div className="relative overflow-hidden rounded-2xl border border-success/20 bg-emerald-950/[0.04] dark:bg-[#06140E]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-black/10">
        {/* Subtle ambient green radial glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full bg-[#25D366]/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 relative z-[1]">
          {/* Header Row */}
          <div className="flex items-start gap-4">
            {/* Green circle with WhatsApp icon */}
            <div className="h-10 w-10 shrink-0 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md shadow-[#25D366]/20">
              <WhatsAppIcon size={20} className="shrink-0" />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <h3 className="text-[15px] sm:text-[16px] font-bold text-foreground leading-snug tracking-tight">
                {heading}
              </h3>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground/80 leading-relaxed">
                This service is currently undergoing maintenance — it will be <span className="font-bold text-foreground">restored shortly With more exciting offers.</span>. Join our WhatsApp channel and you'll be the first to know the moment it's back.
              </p>
            </div>
          </div>

          {/* Button Row */}
          <a
            href={WHATSAPP_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block"
          >
            <button className="w-full h-11 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-2 transition-all shadow-md shadow-[#25D366]/15 active:scale-[0.99]">
              <WhatsAppIcon size={18} className="shrink-0" /> Join our WhatsApp channel
            </button>
          </a>

          {/* Footer Details */}
          <div className="flex items-center justify-center gap-4 text-[10.5px] text-muted-foreground/60 font-semibold pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#25D366]" /> Back very soon
            </span>
            <span className="h-3 w-px bg-border/40" />
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-[#25D366]" /> First to get deals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
