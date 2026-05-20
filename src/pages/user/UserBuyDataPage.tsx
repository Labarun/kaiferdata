/**
 * UserBuyDataPage — Dashboard-native buy page with wallet/Paystack selector
 * Uses real package catalog, premium liquid-glass styling
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { WalletCard } from "@/components/shared/WalletCard";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { CheckoutSheet } from "@/components/buy/CheckoutSheet";
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

const GHANA_NETWORKS = ["MTN", "Telecel", "AirtelTigo"];

type PaymentMethod = "wallet" | "paystack";

export default function UserBuyDataPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(null);
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

  useEffect(() => {
    fetchLoggedInPackages()
      .then(setPackages)
      .catch(() => toast({ title: "Error", description: "Failed to load packages", variant: "destructive" }))
      .finally(() => setLoading(false));

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

  // Auto-pick payment method based on wallet sufficiency until the user
  // explicitly chooses one. Wallet is the preferred default when affordable;
  // Paystack auto-takes over when wallet can't cover the selected bundle.
  useEffect(() => {
    if (userTouchedPayment || !selectedPkg) return;
    if (walletBalance >= Number(selectedPkg.selling_price)) {
      setPaymentMethod("wallet");
    } else {
      setPaymentMethod("paystack");
    }
  }, [walletBalance, selectedPkg, userTouchedPayment]);

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

  const handleNetworkSelect = useCallback((n: string) => {
    setNetwork(n);
    setSelectedPkg(null);
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
        amount: selectedPkg.selling_price,
        description: selectedPkg.validity_label,
        is_active: selectedPkg.is_active,
        sort_order: selectedPkg.display_order,
        metadata: null,
        created_at: selectedPkg.created_at,
        updated_at: selectedPkg.updated_at,
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

      // 3. Optimistically update orders list
      const optimisticOrder = {
        id: "opt-" + Date.now(),
        actor_id: user?.id,
        network,
        beneficiary_number: phoneNumber,
        amount_charged: selectedPkg!.selling_price,
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
          current_balance: Number(old.current_balance) - selectedPkg!.selling_price,
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
    if (!network || !selectedPkg) return;

    setPaymentError(null);
    try {
      if (paymentMethod === "wallet") {
        if (walletBalance < selectedPkg.selling_price) {
          throw new Error(
            `Wallet balance is too low. You need GH₵${selectedPkg.selling_price.toFixed(2)} but have GH₵${walletBalance.toFixed(2)}. Top up first.`,
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
        actorType: "user",
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

  const canAfford = selectedPkg ? walletBalance >= selectedPkg.selling_price : false;

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
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Buy Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Purchase data bundles quickly from your dashboard</p>
        </div>

        <div className="mt-2 mx-auto max-w-[300px] rounded-3xl border border-border/40 bg-slate-950/10 p-2.5 shadow-sm shadow-slate-950/10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{deliverySpeed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border/30 bg-slate-950/5 dark:bg-slate-950/60 p-6 shadow-lg shadow-slate-950/10 backdrop-blur-xl">
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

      <NoticeBanner audience="users" />

      {/* Wallet hero — payment method picker now lives inside CheckoutSheet */}
      <div className="animate-fade-in animate-stagger-1">
        <WalletCard compact />
      </div>

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
              {filteredPackages.length} available
            </span>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="text-center py-12 rounded-2xl glass-card">
              <p className="text-xs text-muted-foreground/60">No packages available for this network yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredPackages.map((pkg, i) => {
                const isActive = selectedPkg?.id === pkg.id;
                const brand = getNetworkBrand(network);
                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    key={pkg.id}
                    type="button"
                    onClick={() => handlePackageSelect(pkg)}
                    className={cn(
                      "group relative flex flex-col rounded-2xl text-left overflow-hidden",
                      "transition-all duration-300 ease-out",
                      "active:scale-[0.95] active:duration-100",
                      isActive
                        ? "glass-elevated refraction-rim"
                        : "glass-card hover:glass-elevated"
                    )}
                    style={{
                      animationDelay: `${i * 50}ms`,
                      ...(isActive
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
                        isActive
                          ? { background: `linear-gradient(90deg, transparent, hsl(${brand.hsl} / 0.7), transparent)` }
                          : { background: `linear-gradient(90deg, transparent, hsl(0 0% 50% / 0.06), transparent)` }
                      }
                    />

                    <div className="p-4 pb-3.5 flex flex-col gap-2 relative">
                      {isActive && (
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
                            isActive ? "text-foreground/90" : "text-foreground/80"
                          )}
                          style={isActive ? { color: `hsl(${brand.hsl})` } : undefined}
                        >
                          {pkg.package_size_label}
                        </span>
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
                      </div>

                      <span className="text-[10.5px] text-muted-foreground/45 leading-snug line-clamp-1 font-medium relative z-[1]">
                        {pkg.package_name}
                        {pkg.validity_label && ` · ${pkg.validity_label}`}
                      </span>

                      <div className="flex items-center justify-between pt-2.5 border-t border-border/20 relative z-[1]">
                        <span
                          className={cn(
                            "text-[15px] font-bold tracking-tight transition-colors duration-200",
                            !isActive && "text-foreground/60"
                          )}
                          style={isActive ? { color: `hsl(${brand.hsl})` } : undefined}
                        >
                          GH₵{Number(pkg.selling_price).toLocaleString()}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-all duration-200",
                            isActive
                              ? "translate-x-0"
                              : "text-muted-foreground/20 -translate-x-1 group-hover:translate-x-0 group-hover:text-muted-foreground/35"
                          )}
                          style={isActive ? { color: `hsl(${brand.hsl} / 0.5)` } : undefined}
                        />
                      </div>
                    </div>

                    {isActive && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[1px]"
                        style={{
                          background: `linear-gradient(90deg, transparent, hsl(${brand.hsl} / 0.25), transparent)`,
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>
      )}

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
      />
    </div>
  );
}
