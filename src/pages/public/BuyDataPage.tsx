/**
 * BuyDataPage — Flagship premium buy-data landing with liquid-glass atmosphere
 * Now powered by real package catalog (data_packages table)
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AlertTriangle, Loader2, Zap, Shield, Clock, Search, Wifi, Smartphone, Truck, SendHorizonal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { PlanSelector } from "@/components/buy/PlanSelector";
import { CheckoutSheet } from "@/components/buy/CheckoutSheet";
import { ServicePaused } from "@/components/buy/ServicePaused";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { AgentPromoModal } from "@/components/marketing/AgentPromoModal";
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
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/SEOHead";

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
    buying_enabled: pkg.buying_enabled,
    category: pkg.category,
  };
}

export default function BuyDataPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(searchParams.get("network"));
  const [activeCategory, setActiveCategory] = useState<"regular" | "express">("regular");
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [plansKey, setPlansKey] = useState(0);
  const [deliverySpeed, setDeliverySpeed] = useState("Fast Delivery");
  const [orderingPaused, setOrderingPaused] = useState(false);

  useEffect(() => {
    fetchPublicPackages()
      .then(setPackages)
      .catch(() => toast({ title: "Error", description: "Failed to load plans", variant: "destructive" }))
      .finally(() => setLoading(false));

    async function fetchSettings() {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "delivery_speed",
          "guest_buy_enabled",
          "guest_checkout_enabled",
          "order_submission_enabled",
          "paystack_checkout_enabled",
          "system_maintenance_mode",
        ]);

      const map = new Map((data || []).map((r: any) => [r.setting_key, r.setting_value]));
      if (map.get("delivery_speed")) setDeliverySpeed(map.get("delivery_speed")!);

      // Fail-open: only an explicit "false" (or maintenance "true") pauses guests.
      const off = (k: string) => map.get(k) === "false";
      setOrderingPaused(
        off("guest_buy_enabled") ||
          off("guest_checkout_enabled") ||
          off("order_submission_enabled") ||
          off("paystack_checkout_enabled") ||
          map.get("system_maintenance_mode") === "true",
      );
    }
    fetchSettings();
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

  const regularPlans = useMemo(
    () => filteredPlans.filter((p) => (p.category || "regular") === "regular"),
    [filteredPlans]
  );

  const expressPlans = useMemo(
    () => filteredPlans.filter((p) => p.category === "express"),
    [filteredPlans]
  );

  const hasExpress = expressPlans.length > 0;

  const displayedPlans = useMemo(() => {
    if (!hasExpress) return filteredPlans;
    if (activeCategory === "express") return expressPlans;
    return regularPlans;
  }, [filteredPlans, activeCategory, hasExpress, regularPlans, expressPlans]);

  useEffect(() => {
    if (hasExpress && activeCategory === "regular" && regularPlans.length === 0) {
      setActiveCategory("express");
    }
  }, [hasExpress, activeCategory, regularPlans.length]);

  const handleNetworkSelect = useCallback((n: string) => {
    setNetwork(n);
    setPlan(null);
    setPlansKey((k) => k + 1);
    setActiveCategory("regular");
  }, []);

  const handlePlanSelect = useCallback((p: DataPlan) => {
    setPlan(p);
    setCheckoutOpen(true);
  }, []);

  const handleOpenCheckout = useCallback(() => setCheckoutOpen(true), []);

  const [processingLabel, setProcessingLabel] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (orderingPaused || !network || !plan) return;
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
      <SEOHead
        title="Buy Data — MTN, Telecel & AirtelTigo Bundles"
        description="Buy cheap MTN, Telecel, and AirtelTigo data bundles in Ghana. No signup required, instant delivery via Paystack. Choose your network and bundle size."
      />
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
            {orderingPaused ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] mb-5 animate-fade-in">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-semibold text-amber-600 tracking-wide">Paused · Back very soon</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-premium text-[11px] mb-5 animate-fade-in refraction-rim overflow-hidden">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_8px_hsl(150_52%_37%/0.45)]" />
                </span>
                <span className="font-semibold text-foreground/65 tracking-wide">Service Online</span>
                <span className="h-3 w-px bg-border/40 mx-0.5" />
                <SendHorizonal className="h-3 w-3 text-warning" />
                <span className="text-foreground/50 font-medium">Processing Orders</span>
              </div>
            )}

            {/* Headline */}
            <h1 className="text-[1.75rem] sm:text-[2.125rem] font-bold tracking-[-0.035em] text-foreground/90 leading-[1.1] animate-fade-in">
              Buy Data{" "}
              <span className="text-gradient-brand">Fast</span>
            </h1>

            <p
              className="mt-4 text-[13.5px] text-muted-foreground/70 leading-[1.65] max-w-[320px] mx-auto animate-fade-in"
              style={{ animationDelay: "0.08s" }}
            >
              Pick a network, choose your bundle, receive data in minutes.
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative">
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div className="container py-3.5">
            <div className="flex items-center justify-center gap-5 sm:gap-8">
              {[
                { icon: Truck, label: "Trusted Delivery", accent: "text-destructive/60" },
                { icon: Shield, label: "Secure Payments", accent: "text-success/60" },
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



      {/* Delivery speed pill — hidden while paused */}
      {!orderingPaused && (
      <div className="container relative z-10 pt-6 mb-8 flex flex-col items-center">
        <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-success/20 bg-[#0A1A14] p-1.5 pl-3 pr-4 shadow-lg shadow-success/5 backdrop-blur-xl max-w-full overflow-hidden">
          <span className="relative flex h-2 w-2 shrink-0 hidden sm:flex">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_8px_hsl(150_52%_37%/0.6)]" />
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" />
          </div>
          <div className="flex flex-col mr-2 sm:mr-4 min-w-0">
            <p className="text-[12px] sm:text-[13px] font-bold text-success leading-tight truncate">Delivery Status: {deliverySpeed}</p>
            <p className="text-[10px] sm:text-[11px] text-success/70 leading-tight truncate">Orders are being delivered according to this status.</p>
          </div>
          <div className="flex items-center gap-1 opacity-80 shrink-0 ml-auto">
            <div className="flex items-end gap-0.5 h-3">
              <div className="w-[3px] bg-success rounded-full h-full animate-[pulse_1s_ease-in-out_infinite]" />
              <div className="w-[3px] bg-success rounded-full h-[60%] animate-[pulse_1s_ease-in-out_infinite_0.2s]" />
              <div className="w-[3px] bg-success rounded-full h-[80%] animate-[pulse_1s_ease-in-out_infinite_0.4s]" />
            </div>
          </div>
          <div className="ml-2 rounded-full border border-success/30 px-1.5 sm:px-2 py-0.5 shrink-0">
            <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-success uppercase flex items-center gap-1">
              <span className="h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full bg-success"></span> Live
            </span>
          </div>
        </div>
        <a href="#notices" className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-warning hover:text-warning/80 transition-colors">
          <AlertTriangle className="h-3 w-3" /> Important Notices
        </a>
      </div>
      )}

      {/* ─── Main buy flow ─── */}
      <div className="container pt-2 sm:pt-4">
        <div className="max-w-lg mx-auto">

          {orderingPaused ? (
            <div className="mb-7">
              <ServicePaused variant="global" />
            </div>
          ) : (
            <>
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
                <section key={plansKey} className="relative animate-plans-enter mb-7">
                  <div className={`absolute inset-0 -z-10 pointer-events-none bg-gradient-to-b ${networkTint} rounded-3xl opacity-60`} />
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary/50" />
                      <p className="section-label">{network} Bundles</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/35 font-medium tabular-nums">
                      {displayedPlans.length} available
                    </span>
                  </div>

                  {hasExpress && (
                    <div className="flex bg-muted/30 p-1 rounded-xl mb-4 w-full relative">
                      <button
                        onClick={() => setActiveCategory("regular")}
                        className={cn(
                          "flex-1 text-xs py-2 rounded-lg font-medium transition-all duration-200",
                          activeCategory === "regular" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Regular Data
                      </button>
                      <button
                        onClick={() => setActiveCategory("express")}
                        className={cn(
                          "relative flex-1 text-xs py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-1.5 overflow-hidden",
                          activeCategory === "express" ? "bg-background shadow text-success ring-1 ring-success/20" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {activeCategory === "express" && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/10 to-transparent -translate-x-[150%] animate-[shimmer_2s_infinite]" />
                        )}
                        <Zap className="h-3 w-3" />
                        Express Data
                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                          Hot
                        </div>
                      </button>
                    </div>
                  )}

                  {filteredPlans.length === 0 ? (
                    <ServicePaused variant="network" network={network} />
                  ) : (
                    <>
                      {displayedPlans.length > 0 && displayedPlans.every((p) => p.buying_enabled === false) && (
                        <div className="mb-6">
                          <ServicePaused variant="network" network={network} />
                        </div>
                      )}

                      {activeCategory === "express" && (
                        <>
                          <p className="text-[10px] font-bold text-success/80 flex items-center gap-1.5 mb-2 ml-1 animate-fade-in">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                            </span>
                            System Status: Express Delivery is operating at peak speed.
                          </p>
                          <Alert className="mb-4 border-success/30 bg-success/5 py-2.5 px-3.5 shadow-[0_4px_14px_-6px_hsl(var(--success)/0.3)]">
                            <div className="flex items-start gap-2.5">
                              <Zap className="h-4 w-4 text-success mt-0.5 shrink-0 fill-success/20" />
                              <AlertDescription className="text-[11px] text-success/90 font-medium leading-[1.4]">
                                <strong className="text-success">Ultra-Fast Delivery!</strong> Delivered in seconds. Ensure your MTN number is verified. <span className="opacity-80">(Instant 24hr refunds for failed orders).</span>
                              </AlertDescription>
                            </div>
                          </Alert>
                        </>
                      )}

                      {activeCategory === "regular" && hasExpress && (
                        <Alert className="mb-4 border-border/50 bg-muted/30 py-2.5 px-3.5 shadow-sm">
                          <div className="flex items-start gap-2.5">
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <AlertDescription className="text-[11px] text-muted-foreground font-medium leading-[1.4]">
                              Regular fulfillment may take longer than usual (5-15 mins). Need it instantly?{" "}
                              <button onClick={() => setActiveCategory("express")} className="text-foreground underline font-bold hover:text-success transition-colors">
                                Switch to Express
                              </button>
                            </AlertDescription>
                          </div>
                        </Alert>
                      )}

                      <PlanSelector plans={displayedPlans} selected={plan} onSelect={handlePlanSelect} network={network} isExpress={activeCategory === 'express'} />
                    </>
                  )}
                </section>
              )}
            </>
          )}

          <div className="flex items-center justify-center gap-2 pt-2 pb-2">
            <Button variant="ghost" size="sm" asChild className="text-[11px] text-muted-foreground/45 h-8 font-medium">
              <Link to="/track">
                <Search className="h-3 w-3 mr-1.5" />
                Track Order
              </Link>
            </Button>
            <span className="h-3 w-px bg-border/40" />
            <Button variant="ghost" size="sm" asChild className="text-[11px] text-muted-foreground/45 h-8 font-medium">
              <Link to="/get-app">
                <Smartphone className="h-3 w-3 mr-1.5" />
                Get the App
              </Link>
            </Button>
          </div>

          <div id="notices" className="mt-8 mb-4">
            <NoticeBanner audience="public" />
            <div className="mt-4 rounded-[2rem] border border-border/30 bg-slate-950/5 dark:bg-slate-950/60 p-6 shadow-lg shadow-slate-950/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-foreground/90 dark:text-white">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-sm shadow-amber-500/10">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold">Important notice</p>
              </div>
              <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <ul className="space-y-2 text-[13px] text-foreground/75 dark:text-foreground/70 list-disc list-inside">
                <li>This service does not work on Turbonet SIM cards.</li>
                <li>Do not place two orders to the same number. Wait for the first order to be delivered first.</li>
                <li>Double-check the phone number before placing an order, there will be no refunds for wrong numbers.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Premium agent promo — smart display rules handled internally */}
      <AgentPromoModal />

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
        orderingPaused={orderingPaused}
      />
    </div>
  );
}
