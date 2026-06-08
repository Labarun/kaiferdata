/**
 * Public Agent Storefront — /store/:slug
 *
 * Uses the agent's *published* selling prices (from agent_bundle_prices)
 * — falls back to admin-defined selling_price for any bundle the agent
 * hasn't priced yet. Snapshots both the agent_selling_price AND
 * agent_base_price into purchase_intents.order_context.referral so the
 * commission trigger can compute exact profit on delivery.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

import { Wifi, Search, Store as StoreIcon, Shield, Zap, Clock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { PlanSelector } from "@/components/buy/PlanSelector";
import { CheckoutSheet } from "@/components/buy/CheckoutSheet";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StorefrontTrackOrderSheet } from "@/components/agent/StorefrontTrackOrderSheet";
import {
  fetchPublicPackages,
  getPackageNetworks,
  filterPackagesByNetwork,
  type DataPackage,
} from "@/services/packageCatalog";
import { fetchPublishedAgentBundles } from "@/services/agentPricing";
import {
  createPurchaseIntent,
  initializePayment,
  type DataPlan,
} from "@/services/purchaseIntent";
import { getStoreBySlug, type AgentProfile } from "@/services/agent";

const GHANA_NETWORKS = ["MTN", "Telecel", "AirtelTigo"];

/** Build a wa.me URL from a Ghanaian phone (auto-prefixes 233). */
function buildWhatsAppHref(phone: string, message: string): string {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "233" + digits.slice(1);
  if (!digits.startsWith("233") && digits.length === 9) digits = "233" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

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

export default function AgentStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [store, setStore] = useState<AgentProfile | null>(null);
  const [storeStatus, setStoreStatus] = useState<"loading" | "found" | "not_found">("loading");
  const [packages, setPackages] = useState<(DataPackage & { _agent_base_price?: number })[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const [network, setNetwork] = useState<string | null>(null);
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [plansKey, setPlansKey] = useState(0);
  const [trackOpen, setTrackOpen] = useState(false);
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(false);
  const [deliverySpeed, setDeliverySpeed] = useState("Swift Delivery");

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "delivery_speed")
        .single();

      if (!error && data?.setting_value) {
        setDeliverySpeed(data.setting_value);
      }
    }
    fetchSettings();
  }, []);

  // Handle automatic WhatsApp tooltip popup
  useEffect(() => {
    const showTimer = setTimeout(() => setShowWhatsAppTooltip(true), 3000);
    const hideTimer = setTimeout(() => setShowWhatsAppTooltip(false), 18000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Load store
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const s = await getStoreBySlug(slug);
      if (cancelled) return;
      setStore(s);
      setStoreStatus(s ? "found" : "not_found");
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Load packages — prefer agent-priced ones, fall back to public catalog.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    (async () => {
      try {
        const [agentPriced, publicPkgs] = await Promise.all([
          fetchPublishedAgentBundles(store.id),
          fetchPublicPackages(),
        ]);
        if (cancelled) return;

        // Merge: prefer agent-priced for any matching id; fill the rest from public.
        const map = new Map<string, DataPackage & { _agent_base_price?: number }>();
        publicPkgs.filter((p) => p.is_agent_resaleable).forEach((p) => map.set(p.id, p as any));
        agentPriced.forEach((p) => map.set(p.id, p as any));
        setPackages(Array.from(map.values()));
      } catch {
        toast({ title: "Error", description: "Failed to load plans", variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingPackages(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  const networks = useMemo(() => {
    const available = getPackageNetworks(packages);
    return GHANA_NETWORKS.filter((n) => available.includes(n));
  }, [packages]);

  useEffect(() => {
    if (!network && networks.length > 0 && !loadingPackages) setNetwork(networks[0]);
  }, [networks, loadingPackages, network]);

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

  const handleConfirm = async () => {
    if (!network || !plan || !store) return;
    setSubmitting(true);
    setPaymentError(null);
    try {
      // Locate the package row to capture base price
      const pkgRow = packages.find((p) => p.id === plan.id);
      const agentBase = pkgRow ? Number(pkgRow._agent_base_price ?? (pkgRow as any).agent_base_price ?? 0) : 0;

      setProcessingLabel("Creating order…");
      const result = await createPurchaseIntent({
        intentType: "guest_buy",
        phoneNumber,
        network,
        plan,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
        referral: {
          agent_profile_id: store.id,
          agent_user_id: store.user_id,
          store_slug: store.store_slug,
          store_name: store.store_name,
          // Pricing snapshot used by handle_order_delivered_commission
          agent_selling_price: Number(plan.amount),
          agent_base_price: agentBase,
        } as any,
      } as any);
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

  if (storeStatus === "loading") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl glass-elevated flex items-center justify-center shimmer-edge overflow-hidden">
            <StoreIcon className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground/60">Loading store…</p>
        </div>
      </div>
    );
  }

  if (storeStatus === "not_found" || !store) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-2xl glass-elevated flex items-center justify-center mb-4">
            <StoreIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Store not found</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            This store doesn't exist or is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  const pageTitle = `${store.store_name} · Buy Data`;
  if (typeof document !== "undefined") document.title = pageTitle;

  return (
    <div className="min-h-[70vh] pb-6">
      <section className="bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[650px] h-[380px] rounded-full bg-[hsl(213_55%_82%/0.4)] blur-[80px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[hsl(192_45%_84%/0.3)] blur-[60px]" />
        </div>

        <div className="container relative pt-12 pb-8 sm:pt-16 sm:pb-10">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-premium text-[9.5px] mb-6 refraction-rim overflow-hidden">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="font-semibold text-foreground/65 tracking-[0.12em] uppercase">Verified Store · <span className="text-foreground">{deliverySpeed}</span></span>
            </div>

            <div className="mx-auto mb-5 h-24 w-24 rounded-3xl glass-elevated flex items-center justify-center overflow-hidden ring-1 ring-primary/10 shadow-[0_18px_40px_-18px_hsl(213_55%_50%/0.35)]">
              {store.store_logo_url ? (
                <img src={store.store_logo_url} alt={`${store.store_name} logo`} className="h-full w-full object-cover" />
              ) : (
                <StoreIcon className="h-9 w-9 text-primary/70" />
              )}
            </div>

            <h1 className="text-[1.85rem] sm:text-[2.15rem] font-bold tracking-[-0.035em] text-foreground/90 leading-[1.05]">
              {store.store_name}
            </h1>
            {store.store_tagline && (
              <p className="mt-3 text-[14px] text-muted-foreground/80 leading-[1.6] max-w-[330px] mx-auto">
                {store.store_tagline}
              </p>
            )}
            {store.business_name && (
              <p className="mt-2.5 text-[11px] text-muted-foreground/55">
                {store.business_name}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div className="container py-3.5">
            <div className="flex items-center justify-center gap-5 sm:gap-8">
              {[
                { icon: Zap, label: "Fast Delivery", accent: "text-primary/60" },
                { icon: Shield, label: "Secure Pay", accent: "text-success/60" },
                { icon: Clock, label: "24/7 Open", accent: "text-info/60" },
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

      <div className="container pt-7 sm:pt-9">
        <div className="max-w-lg mx-auto">
          {loadingPackages ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <Wifi className="h-5 w-5 text-primary animate-pulse" />
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
                <section key={plansKey} className="animate-plans-enter mb-7">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTrackOpen(true)}
                  className="text-[11px] text-muted-foreground/45 h-8 font-medium"
                >
                  <Search className="h-3 w-3 mr-1.5" />
                  Track Order
                </Button>
              </div>
            </>
          )}

          <div className="mt-8 mb-4">
            <NoticeBanner audience="public" />
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

      <StorefrontTrackOrderSheet
        open={trackOpen}
        onOpenChange={setTrackOpen}
        storeName={store?.store_name}
      />

      {/* WhatsApp FAB for Agent Support */}
      {store && (store as any).contact_phone && (
        <Tooltip open={showWhatsAppTooltip} onOpenChange={setShowWhatsAppTooltip}>
          <TooltipTrigger asChild>
            <a
              href={buildWhatsAppHref((store as any).contact_phone, `Hi, I'm at your data store (${store.store_name}) and need some help.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-5 right-5 z-40 group"
              aria-label={`Contact ${store.store_name} on WhatsApp`}
            >
              {/* Ping ring */}
              <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 group-hover:opacity-30" />
              {/* Outer glow */}
              <span className="absolute -inset-1 rounded-full bg-[#25D366]/20 blur-md group-hover:bg-[#25D366]/30 transition-all duration-300" />
              {/* Button */}
              <span className="relative flex items-center justify-center h-12 w-12 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:shadow-[#25D366]/35 hover:scale-105 active:scale-95 transition-all duration-200">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </span>
            </a>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" sideOffset={12}>
            <p className="text-xs">Chat with Store Support</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
