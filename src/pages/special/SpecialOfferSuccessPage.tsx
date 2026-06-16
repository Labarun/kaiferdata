/**
 * SpecialOfferSuccessPage — animated confirmation after a wallet purchase.
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Copy, Check, Eye, Plus, LayoutDashboard, Headset, Clock } from "lucide-react";
import { useState } from "react";
import {
  fetchSpecialOrderWithHistory,
  fetchSpecialSettings,
  formatGhs,
  bundleTypeLabel,
  SUPPORT_WHATSAPP_URL,
  type SpecialBundleType,
} from "@/services/specialBundles";
import { AnimatedCheckmark } from "@/components/shared/AnimatedCheckmark";
import { DeliveryEtaTracker } from "@/components/special/DeliveryEtaTracker";
import { Button } from "@/components/ui/button";
import { useSpecialBase } from "@/hooks/useSpecial";

export default function SpecialOfferSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { base, home } = useSpecialBase();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["special-order", orderId],
    queryFn: () => fetchSpecialOrderWithHistory(orderId!),
    enabled: !!orderId,
  });
  const { data: settings } = useQuery({ queryKey: ["special-settings"], queryFn: fetchSpecialSettings });

  const order = data?.order;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">We couldn't find that order.</p>
        <Link to={base} className="text-primary text-sm font-medium mt-2 inline-block">
          ← Back to offers
        </Link>
      </div>
    );
  }

  const snap = (order.package_snapshot || {}) as Record<string, unknown>;
  const bundleLabel =
    (snap.size_label as string) +
    (snap.bundle_type ? ` (${bundleTypeLabel(snap.bundle_type as SpecialBundleType)})` : "");

  const copyId = () => {
    navigator.clipboard.writeText(order.public_order_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Success hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-premium rounded-2xl p-6 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-success/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="mx-auto mb-3 h-16 w-16 rounded-2xl glass-premium flex items-center justify-center shadow-[0_0_24px_hsl(142_71%_45%/0.25)]">
            <AnimatedCheckmark size={34} className="text-success" strokeWidth={4} />
          </div>
          <h1 className="text-xl font-bold text-foreground">Order received!</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
            Your special bundle order is <span className="font-semibold text-amber-600">Pending</span>. We'll send it
            for processing shortly. Remember — there is no SMS confirmation, so check your balance in the MyMTN app.
          </p>
          <button
            onClick={copyId}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-primary transition-colors"
          >
            {order.public_order_id}
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </motion.div>

      {/* Order summary */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in animate-stagger-1">
        <div className="divide-y divide-border/20">
          <SummaryRow label="Bundle" value={bundleLabel} />
          <SummaryRow label="Network" value={order.network} />
          <SummaryRow label="Recipient" value={order.recipient_number} mono />
          <SummaryRow label="Amount paid" value={formatGhs(order.amount_charged)} strong />
          <SummaryRow label="Status" value="Pending" />
        </div>
      </div>

      {/* Delivery expectation */}
      {settings && <DeliveryEtaTracker eta={settings.eta} className="animate-fade-in animate-stagger-2" />}

      {/* What happens next */}
      <div className="glass-card rounded-2xl p-4 animate-fade-in animate-stagger-2">
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> What happens next
        </h3>
        <ol className="space-y-1.5 text-[12.5px] text-muted-foreground list-decimal list-inside">
          <li>Our team forwards your order to the supplier.</li>
          <li>The status moves to <span className="font-medium text-foreground">Processing</span>, then <span className="font-medium text-foreground">Delivered</span>.</li>
          <li>If it can't be processed, you're refunded to your wallet automatically.</li>
        </ol>
      </div>

      {/* Next actions */}
      <div className="grid grid-cols-2 gap-2.5 animate-fade-in animate-stagger-3">
        <Button variant="default" className="h-11 rounded-xl" onClick={() => navigate(`${base}/orders/${order.id}`)}>
          <Eye className="h-4 w-4 mr-1.5" /> View details
        </Button>
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => navigate(base)}>
          <Plus className="h-4 w-4 mr-1.5" /> Buy another
        </Button>
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => navigate(home)}>
          <LayoutDashboard className="h-4 w-4 mr-1.5" /> Dashboard
        </Button>
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="h-11 rounded-xl w-full">
            <Headset className="h-4 w-4 mr-1.5" /> Support
          </Button>
        </a>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${mono ? "font-mono text-[13px]" : ""} ${strong ? "font-bold" : "font-medium"} text-foreground`}>
        {value}
      </span>
    </div>
  );
}
