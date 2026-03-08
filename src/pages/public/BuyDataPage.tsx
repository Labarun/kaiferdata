/**
 * BuyDataPage - Premium guided buying with liquid-glass surfaces
 */
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { PlanSelector } from "@/components/buy/PlanSelector";
import { CheckoutSheet } from "@/components/buy/CheckoutSheet";
import { IntentCreated } from "@/components/buy/IntentCreated";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import {
  fetchDataPlans,
  getNetworks,
  filterPlansByNetwork,
  createPurchaseIntent,
  type DataPlan,
  type PurchaseIntent,
} from "@/services/purchaseIntent";

export default function BuyDataPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(searchParams.get("network"));
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<PurchaseIntent | null>(null);

  useEffect(() => {
    fetchDataPlans()
      .then(setPlans)
      .catch(() => toast({ title: "Error", description: "Failed to load plans", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const networks = useMemo(() => getNetworks(plans), [plans]);
  const filteredPlans = useMemo(
    () => (network ? filterPlansByNetwork(plans, network) : []),
    [plans, network]
  );

  const handleNetworkSelect = (n: string) => {
    setNetwork(n);
    setPlan(null);
  };

  const handlePlanSelect = (p: DataPlan) => {
    setPlan(p);
    setCheckoutOpen(true);
  };

  const handleConfirm = async () => {
    if (!network || !plan) return;
    setSubmitting(true);
    try {
      const result = await createPurchaseIntent({
        phoneNumber,
        network,
        plan,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
      });
      setIntent(result);
      setCheckoutOpen(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setNetwork(null);
    setPlan(null);
    setPhoneNumber("");
    setCustomerName("");
    setCustomerEmail("");
    setIntent(null);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading plans…</p>
        </div>
      </div>
    );
  }

  if (intent) {
    return (
      <div className="container py-6 sm:py-10">
        <div className="max-w-md mx-auto">
          <IntentCreated intent={intent} onNewOrder={resetFlow} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      {/* Header */}
      <div className="bg-hero-gradient border-b border-border/20">
        <div className="container py-6 sm:py-8">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-xl sm:text-2xl font-medium text-hero-foreground">
              Buy Data Bundle
            </h1>
            <p className="text-xs text-hero-muted mt-1.5">
              Select your network and plan to get started
            </p>
          </div>
        </div>
      </div>

      <div className="container py-5 sm:py-7">
        <div className="max-w-lg mx-auto space-y-5">
          <NoticeBanner audience="public" />

          {/* Network selector */}
          <section>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
              Choose Network
            </p>
            <NetworkSelector
              networks={networks}
              selected={network}
              onSelect={handleNetworkSelect}
            />
          </section>

          {/* Plan grid */}
          {network && (
            <section className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  {network} Plans
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {filteredPlans.length} available
                </p>
              </div>
              <PlanSelector
                plans={filteredPlans}
                selected={plan}
                onSelect={handlePlanSelect}
              />
            </section>
          )}

          {/* Sticky bottom summary */}
          {plan && !checkoutOpen && (
            <div className="sticky bottom-4 z-30 animate-fade-in">
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full glass-strong rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="min-w-0 text-left">
                  <p className="text-xs text-muted-foreground truncate">
                    {plan.volume} · {network}
                  </p>
                  <p className="text-base font-medium text-primary">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 h-9 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 shadow-[0_2px_12px_-3px_hsl(42_88%_56%/0.35)]">
                  Continue →
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        network={network}
        plan={plan}
        phoneNumber={phoneNumber}
        onPhoneChange={setPhoneNumber}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerEmail={customerEmail}
        onCustomerEmailChange={setCustomerEmail}
        onConfirm={handleConfirm}
        loading={submitting}
      />
    </div>
  );
}
