/**
 * UserBuyDataPage — Dashboard-native buy page with wallet/Paystack selector
 * Uses real package catalog, premium liquid-glass styling
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { WalletCard } from "@/components/shared/WalletCard";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { CheckoutSheet } from "@/components/buy/CheckoutSheet";
import { ServicePaused } from "@/components/buy/ServicePaused";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  fetchLoggedInPackages,
  getPackageNetworks,
  filterPackagesByNetwork,
  buildPackageSnapshot,
  type DataPackage,
} from "@/services/packageCatalog";
import {
  createPurchaseIntent,
  initializePayment,
  type DataPlan,
} from "@/services/purchaseIntent";
import { purchaseWithWallet } from "@/services/walletPurchase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getNetworkBrand } from "@/config/networkBrands";
import {
  Wifi,
  Check,
  ChevronRight,
  Zap,
  AlertTriangle,
  SendHorizonal,
} from "lucide-react";

/** Inline WhatsApp glyph (lucide has no brand icon). */
function WhatsAppIcon({ className, size = 12 }: { className?: string; size?: number }) {
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

const GHANA_NETWORKS = ["MTN", "Telecel", "AirtelTigo"];

type PaymentMethod = "wallet" | "paystack";

export default function UserBuyDataPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAgent = user?.role === "agent" || user?.role === "admin";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"regular" | "express">("regular");
  const [selectedPkg, setSelectedPkg] = useState<DataPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wallet");
  const [userTouchedPayment, setUserTouchedPayment] = useState(false);

  // Fetch wallet balance via React Query
  const { data: walletData } = useQuery({
    queryKey: ["user-wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("wallets")
        .select("current_balance")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });
  const walletBalance = Number(walletData?.current_balance || 0);

  // Checkout sheet state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  // Logged-in users: name/email kept as empty no-ops (simplified flow hides fields)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [deliverySpeed, setDeliverySpeed] = useState("Fast Delivery");
  const [orderingPaused, setOrderingPaused] = useState(false);

  useEffect(() => {
    fetchLoggedInPackages()
      .then(setPackages)
      .catch(() => toast({ title: "Error", description: "Failed to load packages", variant: "destructive" }))
      .finally(() => setLoading(false));

    async function fetchSettings() {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["delivery_speed", "user_buy_enabled", "order_submission_enabled", "system_maintenance_mode"]);

      const map = new Map((data || []).map((r: any) => [r.setting_key, r.setting_value]));
      if (map.get("delivery_speed")) setDeliverySpeed(map.get("delivery_speed")!);

      // Fail-open: only an explicit pause toggle hides the buy flow. Paystack-only
      // toggle is excluded so wallet buyers aren't wrongly blocked.
      const off = (k: string) => map.get(k) === "false";
      setOrderingPaused(
        off("user_buy_enabled") || off("order_submission_enabled") || map.get("system_maintenance_mode") === "true",
      );
    }
    fetchSettings();
  }, []);

  // Auto-pick payment method based on wallet sufficiency until the user
  // explicitly chooses one. Wallet is the preferred default when affordable;
  // Paystack auto-takes over when wallet can't cover the selected bundle.
  useEffect(() => {
    if (userTouchedPayment || !selectedPkg) return;
    const pkgPrice = (isAgent && Number(selectedPkg.agent_base_price) > 0)
      ? Number(selectedPkg.agent_base_price)
      : Number(selectedPkg.selling_price);

    if (walletBalance >= pkgPrice) {
      setPaymentMethod("wallet");
    } else {
      setPaymentMethod("paystack");
    }
  }, [walletBalance, selectedPkg, userTouchedPayment, isAgent]);

  const handlePaymentMethodChange = useCallback((m: PaymentMethod) => {
    setUserTouchedPayment(true);
    setPaymentMethod(m);
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

  const filteredPackages = useMemo(
    () => (network ? filterPackagesByNetwork(packages, network) : []),
    [packages, network]
  );

  const hasExpress = useMemo(() => filteredPackages.some(p => p.category === "express"), [filteredPackages]);

  const displayedPackages = useMemo(() => {
    if (!hasExpress) return filteredPackages;
    return filteredPackages.filter(p => (p.category || "regular") === activeCategory);
  }, [filteredPackages, activeCategory, hasExpress]);

  const handleNetworkSelect = useCallback((n: string) => {
    setNetwork(n);
    setSelectedPkg(null);
    setActiveCategory("regular");
  }, []);

  const handlePackageSelect = useCallback((pkg: DataPackage) => {
    setSelectedPkg(pkg);
    setCheckoutOpen(true);
  }, []);

  // Bridge DataPackage → DataPlan for CheckoutSheet compatibility
  const planBridge: DataPlan | null = selectedPkg
    ? {
      id: selectedPkg.id,
      network: selectedPkg.network,
      plan_code: selectedPkg.package_code,
      plan_name: selectedPkg.package_name,
      volume: selectedPkg.package_size_label,
      amount: (isAgent && Number(selectedPkg.agent_base_price) > 0)
        ? Number(selectedPkg.agent_base_price)
        : Number(selectedPkg.selling_price),
      description: selectedPkg.validity_label,
      is_active: selectedPkg.is_active,
      sort_order: selectedPkg.display_order,
      metadata: null,
      created_at: selectedPkg.created_at,
      updated_at: selectedPkg.updated_at,
      buying_enabled: selectedPkg.buying_enabled,
    }
    : null;

  // Optimistic Mutation for Wallet Purchase
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      return purchaseWithWallet({
        packageId: selectedPkg!.id,
        network: network!,
        phoneNumber,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
      });
    },
    onMutate: async () => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user-orders", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["user-wallet", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["user-transactions", user?.id] });

      // 2. Snapshot previous
      const previousOrders = queryClient.getQueryData(["user-orders", user?.id, ""]);
      const previousWallet = queryClient.getQueryData(["user-wallet", user?.id]);

      const pkgPrice = (isAgent && Number(selectedPkg!.agent_base_price) > 0)
        ? Number(selectedPkg!.agent_base_price)
        : Number(selectedPkg!.selling_price);

      // 3. Optimistically update orders list
      const optimisticOrder = {
        id: "opt-" + Date.now(),
        actor_id: user?.id,
        network,
        beneficiary_number: phoneNumber,
        amount_charged: pkgPrice,
        status: "processing",
        bundle_snapshot: { volume: selectedPkg!.package_size_label },
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(["user-orders", user?.id, ""], (old: any) => {
        return [optimisticOrder, ...(old || [])];
      });

      // 4. Optimistically deduct wallet
      if (previousWallet) {
        queryClient.setQueryData(["user-wallet", user?.id], (old: any) => ({
          ...old,
          current_balance: Number(old.current_balance) - pkgPrice,
        }));
      }

      // 5. Close checkout immediately and navigate
      setCheckoutOpen(false);
      navigate("/dashboard/orders");
      toast({
        title: "Processing Order",
        description: `Sending data to ${phoneNumber}...`,
      });

      return { previousOrders, previousWallet };
    },
    onError: (err, variables, context) => {
      // Rollback on failure
      if (context?.previousOrders) {
        queryClient.setQueryData(["user-orders", user?.id, ""], context.previousOrders);
      }
      if (context?.previousWallet) {
        queryClient.setQueryData(["user-wallet", user?.id], context.previousWallet);
      }
      toast({
        title: "Purchase failed",
        description: err.message || "Could not complete purchase.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate to fetch the real data from DB
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
      queryClient.invalidateQueries({ queryKey: ["user-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["user-transactions"] });

      toast({
        title: "Order Successful",
        description: "Your order is confirmed and is being processed.",
      });
    }
  });

  const handleConfirm = async () => {
    if (orderingPaused || !network || !selectedPkg) return;

    setPaymentError(null);
    try {
      const pkgPrice = (isAgent && Number(selectedPkg.agent_base_price) > 0)
        ? Number(selectedPkg.agent_base_price)
        : Number(selectedPkg.selling_price);

      if (paymentMethod === "wallet") {
        if (walletBalance < pkgPrice) {
          throw new Error(
            `Wallet balance is too low. You need GH₵${pkgPrice.toFixed(2)} but have GH₵${walletBalance.toFixed(2)}. Top up first.`,
          );
        }
        // Fire mutation (this navigates instantly)
        purchaseMutation.mutate();
        return;
      }

      setSubmitting(true);
      setProcessingLabel("Creating order…");
      const result = await createPurchaseIntent({
        phoneNumber,
        network,
        plan: planBridge!,
        customerEmail: customerEmail || user?.email || undefined,
        customerName: customerName || user?.fullName || user?.username || undefined,
        actorType: isAgent ? "agent" : "user",
        actorId: user?.id,
        sourceChannel: "user_dashboard",
        intentType: "user_buy",
      });
      setProcessingLabel("Initializing payment…");
      const payment = await initializePayment(result.id);
      setProcessingLabel("Redirecting to Paystack…");
      window.location.href = payment.authorization_url;
    } catch (err: any) {
      setSubmitting(false);
      setPaymentError(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleClearError = () => {
    setPaymentError(null);
    setSubmitting(false);
  };

  const canAfford = selectedPkg
    ? walletBalance >= ((isAgent && Number(selectedPkg.agent_base_price) > 0) ? Number(selectedPkg.agent_base_price) : Number(selectedPkg.selling_price))
    : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center">
            <Wifi className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground/50">Loading packages…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="animate-fade-in flex flex-col items-start gap-3">
        {orderingPaused ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-600 font-semibold">Paused · Back very soon</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle text-[11px] font-medium border-primary/20">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_8px_hsl(150_52%_37%/0.45)]" />
            </div>
            <span className="text-muted-foreground">Service Online</span>
            <span className="text-border mx-0.5">•</span>
            <SendHorizonal className="h-3 w-3 text-warning" />
            <span className="text-muted-foreground">Processing Orders</span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Buy Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Purchase data bundles quickly from your dashboard</p>
        </div>

        {!orderingPaused && (
        <div className="mt-4 flex flex-col items-start w-full">
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
        </div>
        )}
      </div>



      {/* Wallet hero — payment method picker now lives inside CheckoutSheet */}
      <div className="animate-fade-in animate-stagger-1">
        <WalletCard compact />
      </div>

      {orderingPaused ? (
        <ServicePaused variant="global" />
      ) : (
        <>
      {/* Network Selector */}
      <section className="animate-fade-in animate-stagger-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1 w-1 rounded-full bg-primary/50" />
          <p className="section-label">Choose Network</p>
        </div>
        <NetworkSelector
          networks={networks.length > 0 ? networks : GHANA_NETWORKS}
          selected={network}
          onSelect={handleNetworkSelect}
        />
      </section>

      {/* Package Grid */}
      {network && (
        <section className="animate-plans-enter">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary/50" />
              <p className="section-label">{network} Packages</p>
            </div>
            <span className="text-[10px] text-muted-foreground/35 font-medium tabular-nums">
              {displayedPackages.length} available
            </span>
          </div>

          {hasExpress && (
            <div className="flex bg-muted/30 p-1 rounded-xl mb-4 w-full">
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
                  "flex-1 text-xs py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-1.5",
                  activeCategory === "express" ? "bg-background shadow text-success" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="h-3 w-3" />
                Express Data
              </button>
            </div>
          )}

          {displayedPackages.length === 0 ? (
            <div className="text-center py-12 rounded-2xl glass-card">
              <p className="text-xs text-muted-foreground/60">No packages available for this category yet.</p>
            </div>
          ) : (
            <>
              {displayedPackages.every((p) => p.buying_enabled === false) && (
                <div className="mb-6">
                  <ServicePaused variant="network" network={network} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
              {displayedPackages.map((pkg, i) => {
                const isActive = selectedPkg?.id === pkg.id;
                const brand = getNetworkBrand(network);
                const isBuyingPaused = pkg.buying_enabled === false;
                const CardWrapper = isBuyingPaused ? motion.div : motion.button;
                return (
                  <CardWrapper
                    {...(isBuyingPaused ? {} : {
                      whileTap: { scale: 0.95 },
                      type: "button",
                      onClick: () => handlePackageSelect(pkg)
                    })}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    key={pkg.id}
                    className={cn(
                      "group relative flex flex-col rounded-2xl text-left overflow-hidden",
                      "transition-all duration-300 ease-out",
                      isBuyingPaused
                        ? "opacity-90 bg-muted/10 border border-border/30"
                        : isActive
                          ? "glass-elevated refraction-rim"
                          : "glass-card hover:glass-elevated"
                    )}
                    style={{
                      animationDelay: `${i * 50}ms`,
                      ...((isActive && !isBuyingPaused)
                        ? {
                          boxShadow: `0 0 20px -4px hsl(${brand.hsl} / 0.2), 0 4px 16px -4px hsl(${brand.hsl} / 0.12)`,
                        }
                        : {}),
                    }}
                  >
                    {/* Top accent */}
                    <div
                      className="h-[2px] transition-all duration-400"
                      style={
                        (isActive && !isBuyingPaused)
                          ? { background: `linear-gradient(90deg, transparent, hsl(${brand.hsl} / 0.7), transparent)` }
                          : { background: `linear-gradient(90deg, transparent, hsl(0 0% 50% / 0.06), transparent)` }
                      }
                    />

                    <div className="p-4 pb-3.5 flex flex-col gap-2 relative">
                      {(isActive && !isBuyingPaused) && (
                        <div
                          className="absolute inset-0 rounded-b-2xl pointer-events-none"
                          style={{
                            background: `linear-gradient(to bottom, hsl(${brand.hsl} / 0.06), transparent, hsl(${brand.hsl} / 0.02))`,
                          }}
                        />
                      )}

                      <div className="flex items-start justify-between relative z-[1]">
                        <span
                          className={cn(
                            "text-[21px] font-bold leading-none tracking-tight transition-colors duration-200",
                            isBuyingPaused
                              ? "text-muted-foreground/80"
                              : isActive
                                ? "text-foreground/90"
                                : "text-foreground/80"
                          )}
                          style={(isActive && !isBuyingPaused) ? { color: `hsl(${brand.hsl})` } : undefined}
                        >
                          {pkg.package_size_label}
                        </span>
                        {isBuyingPaused ? (
                          <div className="h-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5" />
                        ) : (
                          <div
                            className={cn(
                              "h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5",
                              "transition-all duration-300",
                              !isActive && "border border-border/40 bg-secondary/40 group-hover:border-border/60"
                            )}
                            style={
                              isActive
                                ? {
                                  background: `hsl(${brand.hsl})`,
                                  boxShadow: `0 0 14px -2px hsl(${brand.hsl} / 0.4)`,
                                }
                                : undefined
                            }
                          >
                            {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </div>
                        )}
                      </div>

                      <span className="text-[10.5px] text-muted-foreground/45 leading-snug line-clamp-1 font-medium relative z-[1]">
                        {pkg.package_name}
                        {pkg.validity_label && ` · ${pkg.validity_label}`}
                      </span>

                      <div className={cn(
                        "pt-2.5 border-t border-border/20 relative z-[1] flex",
                        isBuyingPaused
                          ? "flex-col gap-1.5 items-start sm:flex-row sm:items-center sm:justify-between sm:gap-0 w-full"
                          : "flex-row items-center justify-between w-full"
                      )}>
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              "text-[15px] font-bold tracking-tight transition-colors duration-200",
                              isBuyingPaused ? "text-muted-foreground/90" : !isActive && "text-foreground/60"
                            )}
                            style={(isActive && !isBuyingPaused) ? { color: `hsl(${brand.hsl})` } : undefined}
                          >
                            GH₵{(isAgent && Number(pkg.agent_base_price) > 0 ? Number(pkg.agent_base_price) : Number(pkg.selling_price)).toLocaleString()}
                          </span>
                          {isAgent && Number(pkg.agent_base_price) > 0 && (
                            <span className="text-[9px] font-semibold text-success tracking-wide uppercase mt-0.5">
                              Agent Price
                            </span>
                          )}
                        </div>
                        {isBuyingPaused ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-border/40 bg-slate-900/50 dark:bg-slate-900/80 text-muted-foreground/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider select-none shrink-0">
                            <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
                            Unavailable
                          </div>
                        ) : (
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 transition-all duration-200",
                              isActive
                                ? "translate-x-0"
                                : "text-muted-foreground/20 -translate-x-1 group-hover:translate-x-0 group-hover:text-muted-foreground/35"
                            )}
                            style={isActive ? { color: `hsl(${brand.hsl} / 0.5)` } : undefined}
                          />
                        )}
                      </div>

                      {isBuyingPaused && (
                        <a
                          href="https://whatsapp.com/channel/0029VbCn7xiKbYMWspFUrd2r"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2.5 pt-2 border-t border-border/10 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#25D366] hover:text-[#1fb855] hover:underline transition-colors relative z-[2]"
                        >
                          <WhatsAppIcon size={12} className="shrink-0" />
                          Get notified on WhatsApp when it's back
                        </a>
                      )}
                    </div>
                  </CardWrapper>
                );
              })}
            </div>
          </>
        )}
      </section>
    )}
        </>
      )}

      <div className="mt-8 mb-4">
        <NoticeBanner audience="users" />
      </div>

      {/* Checkout Sheet */}
      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        network={network}
        plan={planBridge}
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
        paymentMethod={paymentMethod}
        onPaymentMethodChange={handlePaymentMethodChange}
        walletBalance={walletBalance}
        walletComingSoon={false}
        simplified
        orderingPaused={orderingPaused}
      />
    </div>
  );
}
