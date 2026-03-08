/**
 * BuyDataPage - Premium guided buying interface with glass accents
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { PlanSelector } from "@/components/buy/PlanSelector";
import { OrderReview } from "@/components/buy/OrderReview";
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

type Step = "select" | "details" | "review" | "created";

export default function BuyDataPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(searchParams.get("network"));
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [step, setStep] = useState<Step>("select");
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<PurchaseIntent | null>(null);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    fetchDataPlans()
      .then(setPlans)
      .catch(() => toast({ title: "Error", description: "Failed to load plans", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const networks = getNetworks(plans);
  const filteredPlans = network ? filterPlansByNetwork(plans, network) : [];

  const handleNetworkSelect = (n: string) => {
    setNetwork(n);
    setPlan(null);
  };

  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 11) {
      setPhoneError("Enter a valid phone number (10-11 digits)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 11);
    setPhoneNumber(cleaned);
    if (phoneError) validatePhone(cleaned);
  };

  const canContinue = network && plan;
  const canReview = phoneNumber.length >= 10;

  const handleContinueToDetails = () => {
    if (!network || !plan) return;
    setStep("details");
  };

  const handleReview = () => {
    if (!validatePhone(phoneNumber)) return;
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!network || !plan) return;
    setSubmitting(true);
    try {
      const result = await createPurchaseIntent({
        phoneNumber, network, plan,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
      });
      setIntent(result);
      setStep("created");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to create purchase intent", variant: "destructive" });
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
    setStep("select");
    setIntent(null);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-pulse-soft">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      {/* Page header with gradient */}
      <div className="bg-hero-gradient">
        <div className="container py-6 sm:py-8">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold text-hero-foreground">Buy Data</h1>
            <p className="text-xs sm:text-sm text-hero-muted mt-1">
              {step === "select" && "Select your network and data plan"}
              {step === "details" && "Enter the recipient details"}
              {step === "review" && "Review your order before payment"}
              {step === "created" && "Your order has been initialized"}
            </p>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {["select", "details", "review", "created"].map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? "w-6 bg-primary" :
                    ["select", "details", "review", "created"].indexOf(step) > i ? "w-4 bg-primary/40" :
                    "w-4 bg-hero-foreground/15"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5 sm:py-6">
        <div className="max-w-lg mx-auto">
          <NoticeBanner audience="public" />

          {/* STEP: Network + Plan Selection */}
          {step === "select" && (
            <div className="space-y-6 animate-fade-in">
              <section>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Network</p>
                <NetworkSelector networks={networks} selected={network} onSelect={handleNetworkSelect} />
              </section>

              {network && (
                <section className="animate-fade-in">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Data Plans — {network}
                  </p>
                  <PlanSelector plans={filteredPlans} selected={plan} onSelect={setPlan} />
                </section>
              )}

              {/* Floating sticky CTA */}
              {canContinue && (
                <div className="sticky bottom-4 z-30 animate-fade-in">
                  <div className="glass rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{plan!.volume} — {network}</p>
                      <p className="text-sm font-extrabold text-primary">GH₵{Number(plan!.amount).toLocaleString()}</p>
                    </div>
                    <Button onClick={handleContinueToDetails} className="h-10 px-5 rounded-xl text-xs font-bold shadow-sm shrink-0">
                      Continue
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: Recipient Details */}
          {step === "details" && (
            <div className="space-y-5 animate-fade-in">
              {/* Back button */}
              <button onClick={() => setStep("select")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Back to plans
              </button>

              {/* Selected plan summary */}
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{network}</p>
                    <p className="text-sm font-bold text-foreground">{plan?.volume} — {plan?.plan_name}</p>
                  </div>
                  <p className="text-lg font-extrabold text-primary">GH₵{Number(plan?.amount || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Phone input */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold text-foreground">
                  Recipient Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0XX XXX XXXX"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`h-12 text-base rounded-xl font-semibold ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  maxLength={11}
                />
                {phoneError && <p className="text-[11px] text-destructive font-medium">{phoneError}</p>}
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs text-muted-foreground">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                    maxLength={255}
                  />
                </div>
              </div>

              <Button
                onClick={handleReview}
                className="w-full h-12 rounded-xl text-sm font-bold shadow-sm"
                disabled={!canReview}
              >
                Review Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP: Review */}
          {step === "review" && network && plan && (
            <OrderReview
              network={network}
              plan={plan}
              phoneNumber={phoneNumber}
              customerName={customerName || undefined}
              customerEmail={customerEmail || undefined}
              onBack={() => setStep("details")}
              onConfirm={handleConfirm}
              loading={submitting}
            />
          )}

          {/* STEP: Created */}
          {step === "created" && intent && (
            <IntentCreated intent={intent} onNewOrder={resetFlow} />
          )}
        </div>
      </div>
    </div>
  );
}