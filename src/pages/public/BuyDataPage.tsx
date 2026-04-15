/**
 * BuyDataPage — Flagship premium buy-data landing with liquid-glass atmosphere
 * Now powered by real package catalog (data_packages table)
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Zap, Shield, Clock, Search, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { PlanSelector } from "@/components/buy/PlanSelector";
import { CheckoutSheet } from "@/components/buy/CheckoutSheet";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import {
  fetchPublicPackages,
  getPackageNetworks,
  filterPackagesByNetwork,
  type DataPackage,
} from "@/services/packageCatalog";
import {
  createPurchaseIntent,
  initializePayment,
  type DataPlan,
} from "@/services/purchaseIntent";

const GHANA_NETWORKS = ["MTN", "Telecel", "AirtelTigo"];

const NETWORK_TINT: Record<string, string> = {
  MTN: "from-[hsl(44_60%_46%/0.05)] to-transparent",
  Telecel: "from-[hsl(0_60%_52%/0.04)] to-transparent",
  AirtelTigo: "from-[hsl(212_70%_52%/0.04)] to-transparent",
};

/** Bridge DataPackage → DataPlan for PlanSelector/CheckoutSheet compatibility */
function packageToPlan(pkg: DataPackage): DataPlan {
  return {
    id: pkg.id,
    network: pkg.network,
    plan_code: pkg.package_code,
    plan_name: pkg.package_name,
    volume: pkg.package_size_label,
    amount: pkg.selling_price,
    description: pkg.validity_label,
    is_active: pkg.is_active,
    sort_order: pkg.display_order,
    metadata: null,
    created_at: pkg.created_at,
    updated_at: pkg.updated_at,
  };
}

export default function BuyDataPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(searchParams.get("network"));
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [plansKey, setPlansKey] = useState(0);

  useEffect(() => {
    fetchPublicPackages()
      .then(setPackages)
      .catch(() => toast({ title: "Error", description: "Failed to load plans", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const networks = useMemo(() => {
    const available = getPackageNetworks(packages);
    return GHANA_NETWORKS.filter((n) => available.includes(n));
  }, [packages]);

  useEffect(() => {
    if (!network && networks.length > 0 && !loading) {
      setNetwork(networks[0]);
    }
  }, [networks, loading]);

  const filteredPlans = useMemo(
    () => (network ? filterPackagesByNetwork(packages, network).map(packageToPlan) : []),
    [packages, network]
  );

  const handleNetworkSelect = useCallback((n: string) => {
    setNetwork(n);
    setPlan(null);
    setPlansKey((k) => k + 1);
  }, []);

  const handlePlanSelect = useCallback((p: DataPlan) => {
    setPlan(p);
    setCheckoutOpen(true);
  }, []);

  const handleOpenCheckout = useCallback(() => setCheckoutOpen(true), []);

  const [processingLabel, setProcessingLabel] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!network || !plan) return;
    setSubmitting(true);
    setPaymentError(null);
    try {
      setProcessingLabel("Creating order…");
      const result = await createPurchaseIntent({ phoneNumber, network, plan, customerEmail: customerEmail || undefined, customerName: customerName || undefined });
      setProcessingLabel("Initializing payment…");
      const payment = await initializePayment(result.id);
      setProcessingLabel("Redirecting to Paystack…");
      window.location.href = payment.authorization_url;
    } catch (err: any) {
      setSubmitting(false);
      setPaymentError(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleClearError = () => { setPaymentError(null); setSubmitting(false); };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl glass-elevated flex items-center justify-center shimmer-edge overflow-hidden">
            <Wifi className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground/60">Loading plans…</p>
        </div>
      </div>
    );
  }

  const networkTint = network ? NETWORK_TINT[network] || "" : "";

  return (
    <div className="min-h-[70vh] pb-6">
      {/* ─── Premium hero atmosphere ─── */}
      <section className="bg-hero-gradient relative overflow-hidden">
        {/* Layered ambient orbs — deeper, richer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[650px] h-[380px] rounded-full bg-[hsl(213_55%_82%/0.4)] blur-[80px] will-change-transform" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[hsl(192_45%_84%/0.3)] blur-[60px] will-change-transform" />
          <div className="absolute top-[45%] left-[-8%] w-[240px] h-[240px] rounded-full bg-[hsl(213_45%_82%/0.2)] blur-[50px] will-change-transform" />
        </div>

        <div className="container relative pt-12 pb-8 sm:pt-16 sm:pb-10">
          <div className="max-w-md mx-auto text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-premium text-[11px] mb-6 animate-fade-in refraction-rim overflow-hidden">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_8px_hsl(150_52%_37%/0.45)]" />
              </span>
              <span className="font-semibold text-foreground/65 tracking-wide">Service Online</span>
              <span className="h-3 w-px bg-border/40 mx-0.5" />
              <Zap className="h-3 w-3 text-warning" />
              <span className="text-foreground/50 font-medium">Fast Delivery</span>
            </div>

            {/* Headline */}
            <h1 className="text-[1.75rem] sm:text-[2.125rem] font-bold tracking-[-0.035em] text-foreground/90 leading-[1.1] animate-fade-in">
              Buy Data{" "}
              <span className="text-gradient-brand">Fast</span>
            </h1>
            <p
              className="mt-3.5 text-[13.5px] text-muted-foreground/70 leading-[1.65] max-w-[320px] mx-auto animate-fade-in"
              style={{ animationDelay: "0.08s" }}
            >
              Pick a network, choose your bundle, receive data in minutes.
            </p>
          <div className="mt-6 animate-fade-in" style={{ animationDelay: "0.12s" }}>
            <Button variant="outline" size="sm" className="rounded-full glass-subtle border-border/50 text-foreground/80 hover:text-foreground" asChild>
              <Link to="/about">About Kaifer Data</Link>
            </Button>
          </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative">
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div className="container py-3.5">
            <div className="flex items-center justify-center gap-5 sm:gap-8">
              {[
                { icon: Zap, label: "Instant", accent: "text-primary/60" },
                { icon: Shield, label: "Secure", accent: "text-success/60" },
                { icon: Clock, label: "24/7", accent: "text-info/60" },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="h-3 w-px bg-border/30 -ml-2.5 mr-0.5 sm:-ml-4 sm:mr-0" />}
                  <div className="h-5 w-5 rounded-md glass-subtle flex items-center justify-center">
                    <item.icon className={`h-3 w-3 ${item.accent}`} />
                  </div>
                  <span className="text-[11px] text-muted-foreground/60 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border/25 to-transparent" />
        </div>
      </section>

      {/* ─── Main buy flow ─── */}
      <div className="container pt-7 sm:pt-9">
        <div className="max-w-lg mx-auto">
          <NoticeBanner audience="public" />

          <section className="mb-7">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="h-1 w-1 rounded-full bg-primary/50" />
              <p className="section-label">Choose Network</p>
            </div>
            <NetworkSelector
              networks={networks.length > 0 ? networks : GHANA_NETWORKS}
              selected={network}
              onSelect={handleNetworkSelect}
            />
          </section>

          {network && (
            <section key={plansKey} className="animate-plans-enter mb-7">
              <div className={`absolute inset-0 -z-10 pointer-events-none bg-gradient-to-b ${networkTint} rounded-3xl opacity-60`} />
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary/50" />
                  <p className="section-label">{network} Bundles</p>
                </div>
                <span className="text-[10px] text-muted-foreground/35 font-medium tabular-nums">
                  {filteredPlans.length} available
                </span>
              </div>
              <PlanSelector plans={filteredPlans} selected={plan} onSelect={handlePlanSelect} network={network} />
            </section>
          )}

          <div className="flex items-center justify-center pt-2 pb-2">
            <Button variant="ghost" size="sm" asChild className="text-[11px] text-muted-foreground/45 h-8 font-medium">
              <Link to="/track">
                <Search className="h-3 w-3 mr-1.5" />
                Track Order
              </Link>
            </Button>
          </div>
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
        processingLabel={processingLabel}
        paymentError={paymentError}
        onClearError={handleClearError}
      />
    </div>
  );
}
