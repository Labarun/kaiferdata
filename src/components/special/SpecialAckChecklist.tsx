/**
 * SpecialAckChecklist — the points the user must understand, with a SINGLE
 * confirmation checkbox that gates the purchase.
 */
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";

const ACK_POINTS = [
  "This bundle is for MTN numbers only.",
  "There is no SMS confirmation message for this bundle.",
  "I'll check my data balance myself (ideally in the MyMTN app), before and after.",
  "Delivery can sometimes take longer than normal.",
  "If my order can't be processed, it will be refunded to my wallet.",
  "I've double-checked that the recipient number is correct.",
];

export function SpecialAckChecklist({ onChange }: { onChange: (allChecked: boolean) => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-3">
        Confirm you understand
      </p>

      <ul className="space-y-2 mb-3">
        {ACK_POINTS.map((point) => (
          <li key={point} className="flex items-start gap-2.5">
            <span className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-2.5 w-2.5 text-primary" />
            </span>
            <span className="text-[12.5px] leading-relaxed text-foreground/90">{point}</span>
          </li>
        ))}
      </ul>

      <label className="flex items-start gap-3 cursor-pointer group pt-3 border-t border-border/40">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => {
            const next = v === true;
            setChecked(next);
            onChange(next);
          }}
          className="mt-0.5"
        />
        <span className="text-[12.5px] font-medium leading-relaxed text-foreground group-hover:text-foreground transition-colors">
          I confirm I have read and understood all of the above.
        </span>
      </label>
    </div>
  );
}
