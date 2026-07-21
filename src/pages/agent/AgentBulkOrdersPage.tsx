import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getNetworkBrand } from "@/config/networkBrands";
import { fetchLoggedInPackages, getPackageNetworks, filterPackagesByNetwork, type DataPackage } from "@/services/packageCatalog";
import { createPurchaseIntent, initializePayment } from "@/services/purchaseIntent";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, CreditCard, Wallet, AlertCircle, Sparkles, Phone, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubscriptionGate } from "@/components/agent/SubscriptionGate";
import { cn } from "@/lib/utils";
import { formatGHS } from "@/services/paystackFee";

const GHANA_NETWORKS = ["MTN", "Telecel", "AirtelTigo"];

export default function AgentBulkOrdersPage() {
  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader title="Bulk Orders" description="Buy data for multiple customers at once." />
      <SubscriptionGate message="Subscribe to unlock bulk ordering.">
        <BulkOrderFlow />
      </SubscriptionGate>
    </div>
  );
}

function BulkOrderFlow() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(null);
  const [category, setCategory] = useState<"regular" | "express">("regular");
  const [selectedPkg, setSelectedPkg] = useState<DataPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "paystack">("wallet");
  
  const [rawNumbers, setRawNumbers] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Parse phone numbers
  const validNumbers = useMemo(() => {
    if (!rawNumbers) return [];
    // Split by comma, newline, space
    const tokens = rawNumbers.split(/[\n, ]+/);
    const cleaned = tokens
      .map(t => t.replace(/[^0-9]/g, ""))
      .filter(t => t.length >= 10 && t.length <= 11);
    // Deduplicate
    return [...new Set(cleaned)];
  }, [rawNumbers]);

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

  useEffect(() => {
    fetchLoggedInPackages()
      .then(setPackages)
      .catch(() => toast({ title: "Error", description: "Failed to load packages", variant: "destructive" }))
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

  const availableCategories = useMemo(() => {
    if (!network) return { hasRegular: false, hasExpress: false };
    const networkPkgs = filterPackagesByNetwork(packages, network);
    const hasReg = networkPkgs.some(p => p.category !== "express");
    const hasExp = networkPkgs.some(p => p.category === "express");
    return { hasRegular: hasReg, hasExpress: hasExp };
  }, [packages, network]);

  useEffect(() => {
    if (availableCategories.hasRegular && !availableCategories.hasExpress) {
      setCategory("regular");
    } else if (!availableCategories.hasRegular && availableCategories.hasExpress) {
      setCategory("express");
    } else if (availableCategories.hasRegular) {
      setCategory("regular");
    }
  }, [network, availableCategories]);

  const filteredPackages = useMemo(() => {
    if (!network) return [];
    let list = filterPackagesByNetwork(packages, network);
    if (category === "express") {
      list = list.filter(p => p.category === "express");
    } else {
      list = list.filter(p => p.category !== "express");
    }
    return list;
  }, [packages, network, category]);

  const handleNetworkSelect = useCallback((n: string) => {
    setNetwork(n);
    setSelectedPkg(null);
  }, []);

  const getAgentPrice = (pkg: DataPackage) => Number(pkg.agent_base_price > 0 ? pkg.agent_base_price : pkg.selling_price);

  const totalCost = selectedPkg ? getAgentPrice(selectedPkg) * validNumbers.length : 0;
  const canAffordWallet = walletBalance >= totalCost;

  const handleProcessBulk = async () => {
    if (!selectedPkg || validNumbers.length === 0 || !network || !user) return;
    setSubmitting(true);

    try {
      if (paymentMethod === "wallet") {
        if (!canAffordWallet) {
          throw new Error("Insufficient wallet balance for this bulk order.");
        }
        
        // Call the secure edge function which handles the RPC and triggers fulfillment
        const { data, error } = await supabase.functions.invoke("wallet-bulk-purchase", {
          body: {
            package_id: selectedPkg.id,
            phone_numbers: validNumbers,
            network: network,
          },
        });

        if (error) {
          throw new Error(error.message || "Failed to process wallet bulk order");
        }
        if (data?.error) {
          throw new Error(data.error);
        }

        setSuccessCount(validNumbers.length);
        toast({ title: "Success!", description: `Successfully placed ${validNumbers.length} orders.` });
        
      } else {
        // Paystack flow
        const bridgedPlan = {
          id: selectedPkg.id,
          plan_code: selectedPkg.package_code,
          plan_name: selectedPkg.package_name,
          amount: getAgentPrice(selectedPkg),
          volume: selectedPkg.package_size_label,
          network: selectedPkg.network,
          description: selectedPkg.validity_label,
          is_active: true,
          sort_order: 0,
          metadata: {},
          created_at: "",
          updated_at: ""
        };

        const intent = await createPurchaseIntent({
          phoneNumber: validNumbers[0], // primary
          bulkPhoneNumbers: validNumbers,
          network,
          plan: bridgedPlan,
          actorType: "user",
          actorId: user.id,
          sourceChannel: "agent_bulk_dashboard",
          intentType: "agent_bulk_buy"
        });

        const payment = await initializePayment(intent.id);
        window.location.href = payment.authorization_url;
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Bulk Order Failed", description: err.message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (successCount !== null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Bulk Order Completed!</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Successfully processed {successCount} orders. Your wallet was charged automatically.
        </p>
        <div className="pt-4 flex gap-3">
          <Button variant="outline" onClick={() => navigate("/agent/orders")}>View Orders</Button>
          <Button onClick={() => { setSuccessCount(null); setRawNumbers(""); setSelectedPkg(null); }}>Start New Batch</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!network) {
    return (
      <div className="px-4 py-3 rounded-xl glass-subtle border border-destructive/20 text-destructive text-[13px]">
        No networks available at the moment.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Select Network */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">1</span>
          </div>
          <h3 className="font-semibold text-[15px]">Select Network</h3>
        </div>
        <NetworkSelector networks={networks} selected={network} onSelect={handleNetworkSelect} />
      </section>

      {/* 2. Select Package */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">2</span>
          </div>
          <h3 className="font-semibold text-[15px]">Select Package</h3>
        </div>
        
        {availableCategories.hasRegular && availableCategories.hasExpress && (
          <div className="flex items-center gap-2 mb-2 bg-muted/40 p-1.5 rounded-xl border border-border/40 w-fit mx-auto sm:mx-0">
            <button
              onClick={() => { setCategory("regular"); setSelectedPkg(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                category === "regular" 
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Phone className="h-3.5 w-3.5" /> Regular Data
            </button>
              <button
                onClick={() => { setCategory("express"); setSelectedPkg(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  category === "express" 
                    ? "bg-background text-success shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-success hover:bg-muted/50"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Express Data
              </button>
          </div>
        )}

        {category === "express" && (
          <Alert className="mb-2 border-warning/30 bg-warning/5 py-2.5 px-3.5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <AlertDescription className="text-[11px] text-warning/90 font-medium leading-[1.4]">
                Express orders are only for verified MTN numbers. If your order gets rejected and it fails a refund will be processed within 24 hours.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {filteredPackages.length === 0 ? (
          <div className="px-4 py-3 rounded-xl glass-subtle border border-warning/20 text-warning text-[13px]">
            {`No active packages for ${network}.`}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredPackages.map((pkg) => {
              const isSelected = selectedPkg?.id === pkg.id;
              const netBrand = getNetworkBrand(pkg.network);
              const isBuyingPaused = pkg.buying_enabled === false;
              return (
                <button
                  key={pkg.id}
                  onClick={() => !isBuyingPaused && setSelectedPkg(pkg)}
                  disabled={isBuyingPaused}
                  className={cn(
                    "relative text-left p-4 rounded-2xl border transition-all duration-200 overflow-hidden group",
                    isBuyingPaused
                      ? "opacity-60 cursor-not-allowed bg-muted/20 border-border/40"
                      : isSelected
                        ? "border-transparent bg-[hsl(var(--card))] shadow-[0_0_0_2px_hsl(var(--primary)),0_8px_20px_-8px_hsl(var(--primary)/0.25)]"
                        : "border-border/40 bg-card hover:border-primary/30 hover:bg-muted/30"
                  )}
                >
                  {(isSelected && !isBuyingPaused) && (
                    <div 
                      className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{ background: `linear-gradient(45deg, hsl(${netBrand.hsl}), transparent)` }}
                    />
                  )}
                  <div className="relative flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                      {pkg.network}
                    </span>
                    {isBuyingPaused ? (
                      <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Paused
                      </span>
                    ) : (
                      <span className="font-bold text-[15px] tracking-tight">GH₵{formatGHS(getAgentPrice(pkg))}</span>
                    )}
                  </div>
                  <div className="relative">
                    <h4 className={cn(
                      "text-[17px] font-bold tracking-tight",
                      isBuyingPaused ? "text-muted-foreground" : "text-foreground/90"
                    )}>{pkg.package_size_label}</h4>
                    <p className="text-[11px] font-medium text-muted-foreground/60 mt-1">{pkg.validity_label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Enter Recipients */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <h3 className="font-semibold text-[15px]">Recipients</h3>
          </div>
        </div>
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <Label className="text-xs text-muted-foreground font-medium flex justify-between">
              <span>Paste phone numbers (comma or newline separated)</span>
              {validNumbers.length > 0 && (
                <span className="text-primary font-bold">{validNumbers.length} Valid</span>
              )}
            </Label>
            <Textarea
              placeholder="e.g. 024XXXXXXX, 055XXXXXXX&#10;054XXXXXXX"
              value={rawNumbers}
              onChange={(e) => setRawNumbers(e.target.value)}
              className="min-h-[120px] font-mono text-sm resize-y"
            />
            <div className="flex justify-end">
              <Button asChild variant="outline" size="sm" className="text-xs h-8">
                <Link to="/agent/customers">
                  <Users className="h-3.5 w-3.5 mr-1.5" /> View CRM Address Book
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Payment */}
      {selectedPkg && validNumbers.length > 0 && (
        <section className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-background border border-primary/10 shadow-sm space-y-5">
            
            <div className="flex justify-between items-end pb-4 border-b border-border/50">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Batch Cost</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight">GH₵{formatGHS(totalCost)}</span>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {validNumbers.length} × GH₵{formatGHS(getAgentPrice(selectedPkg))}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setPaymentMethod("wallet")}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border text-left transition-all",
                  paymentMethod === "wallet" 
                    ? "border-primary/50 bg-primary/5 shadow-sm" 
                    : "border-border/50 bg-card hover:bg-accent/50"
                )}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={cn("p-2 rounded-lg", paymentMethod === "wallet" ? "bg-primary/20" : "bg-muted")}>
                    <Wallet className={cn("h-4 w-4", paymentMethod === "wallet" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  {paymentMethod === "wallet" && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm font-semibold">Pay with Wallet</span>
                <span className="text-[11px] text-muted-foreground font-medium mt-0.5">Bal: GH₵{formatGHS(walletBalance)}</span>
              </button>
            </div>

            {paymentMethod === "wallet" && !canAffordWallet && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Insufficient wallet balance. Please top up your wallet to continue.</p>
              </div>
            )}

            <Button 
              className="w-full h-14 rounded-xl text-[15px] font-bold shadow-lg"
              disabled={submitting || (paymentMethod === "wallet" && !canAffordWallet)}
              onClick={handleProcessBulk}
            >
              {submitting ? "Processing Batch..." : "Process Bulk Order"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
