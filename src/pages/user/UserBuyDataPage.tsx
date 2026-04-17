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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getNetworkBrand } from "@/config/networkBrands";
import {
  Wifi,
  Loader2,
  Check,
  ChevronRight,
  Wallet,
  CreditCard,
  Zap,
  AlertCircle,
} from "lucide-react";

const GHANA_NETWORKS = ["MTN", "Telecel", "AirtelTigo"];

type PaymentMethod = "wallet" | "paystack";

export default function UserBuyDataPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<DataPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paystack");

  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Checkout sheet state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState(user?.fullName || "");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    fetchLoggedInPackages()
      .then(setPackages)
      .catch(() => toast({ title: "Error", description: "Failed to load packages", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  // Fetch wallet balance
  useEffect(() => {
    if (!user) return;
    supabase
      .from("wallets")
      .select("current_balance")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setWalletBalance(Number(data.current_balance));
      });
  }, [user]);

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

  const handleConfirm = async () => {
    if (!network || !selectedPkg) return;

    if (paymentMethod === "wallet") {
      // Wallet checkout edge function ships in Phase 2 — keep guard so the
      // anti-manipulation/payment logic stays untouched in Phase 1.
      toast({
        title: "Coming soon",
        description: "Wallet checkout for bundles ships in the next update. Use Paystack for now.",
      });
      return;
    }

    setSubmitting(true);
    setPaymentError(null);
    try {
      setProcessingLabel("Creating order…");
      const result = await createPurchaseIntent({
        phoneNumber,
        network,
        plan: planBridge!,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
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
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Buy Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Purchase data bundles quickly from your dashboard</p>
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
                  <button
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
                  </button>
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
      />
    </div>
  );
}
