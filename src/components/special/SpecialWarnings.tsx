/**
 * SpecialWarnings — the must-read explanation block for the special bundle.
 *
 * This bundle behaves differently from normal bundles, so users MUST see these
 * points clearly before ordering.
 */
import { Smartphone, BellOff, Wallet, Clock, ShieldQuestion, PhoneCall } from "lucide-react";

const WARNINGS = [
  {
    icon: Smartphone,
    title: "MTN only",
    body: "This special offer works for MTN numbers only — not Telecel or AirtelTigo.",
  },
  {
    icon: BellOff,
    title: "No SMS confirmation",
    body: "Unlike normal bundles, this one does NOT send an SMS confirmation message when it arrives.",
  },
  {
    icon: ShieldQuestion,
    title: "Check your balance yourself",
    body: "Because there is no SMS, check your data balance before and after ordering — ideally in the MyMTN app, which shows each bundle type separately (a screenshot helps).",
  },
  {
    icon: Clock,
    title: "Delivery can take longer",
    body: "Most orders arrive within minutes, but it can sometimes take several hours — up to 12 or 24 hours depending on the situation.",
  },
  {
    icon: Wallet,
    title: "Refunds go to your wallet",
    body: "If your order can't be processed for any reason, the amount is refunded straight back to your wallet.",
  },
  {
    icon: PhoneCall,
    title: "Double-check the number",
    body: "Confirm the recipient MTN number carefully — bundles sent to a wrong number can't be recovered.",
  },
];

export function SpecialWarnings() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/20 bg-amber-500/5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span className="text-amber-500">●</span> Please read — this bundle works differently
        </h3>
      </div>
      <ul className="divide-y divide-border/15">
        {WARNINGS.map((w) => (
          <li key={w.title} className="flex items-start gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <w.icon className="h-4 w-4 text-foreground/70" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{w.title}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{w.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
