/**
 * SpecialAckChecklist — explicit acknowledgement before ordering.
 *
 * The user must tick every item before the Buy button is enabled. Reports the
 * "all acknowledged" boolean up to the parent so it can gate the purchase.
 */
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

const ACK_ITEMS = [
  { id: "mtn", label: "This bundle is for MTN numbers only." },
  { id: "sms", label: "There is no SMS confirmation message for this bundle." },
  { id: "balance", label: "I'll check my data balance myself (ideally in the MyMTN app), before and after." },
  { id: "time", label: "Delivery can sometimes take longer than normal." },
  { id: "refund", label: "If my order can't be processed, it will be refunded to my wallet." },
  { id: "number", label: "I've double-checked that the recipient number is correct." },
];

export function SpecialAckChecklist({ onChange }: { onChange: (allChecked: boolean) => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string, val: boolean) => {
    const next = { ...checked, [id]: val };
    setChecked(next);
    onChange(ACK_ITEMS.every((it) => next[it.id]));
  };

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-3">
        Confirm you understand
      </p>
      <div className="space-y-3">
        {ACK_ITEMS.map((item) => (
          <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={!!checked[item.id]}
              onCheckedChange={(v) => toggle(item.id, v === true)}
              className="mt-0.5"
            />
            <span className="text-[12.5px] leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
