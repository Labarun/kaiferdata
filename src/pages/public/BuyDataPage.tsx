/**
 * BuyDataPage - Guest data purchase flow
 * Multi-step: network → plan → phone → review → intent creation
 */
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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

type Step = "select" | "review" | "created";

export default function BuyDataPage() {
  const { toast } = useToast();

  // Catalog state
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [network, setNetwork] = useState<string | null>(null);
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Flow state
  const [step, setStep] = useState<Step>("select");
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<PurchaseIntent | null>(null);

  // Validation
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
    setPlan(null); // reset plan when network changes
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
    // Only allow digits
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 11);
    setPhoneNumber(cleaned);
    if (phoneError) validatePhone(cleaned);
  };

  const canProceed = network && plan && phoneNumber.length >= 10;

  const handleReview = () => {
    if (!validatePhone(phoneNumber)) return;
    if (!network || !plan) return;
    setStep("review");
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
      setStep("created");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create purchase intent",
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
    setStep("select");
    setIntent(null);
  };

  if (loading) {
    return (
      <div className="container py-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 sm:py-8">
      <div className="max-w-lg mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Buy Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {step === "select" && "Select your network, plan, and enter the recipient number."}
            {step === "review" && "Review your order details before continuing."}
            {step === "created" && "Your order has been initialized."}
          </p>
        </div>

        {/* Notices */}
        <NoticeBanner audience="public" />

        {/* Step: Select */}
        {step === "select" && (
          <div className="space-y-6 animate-fade-in">
            {/* Network selection */}
            <section>
              <Label className="text-sm font-semibold text-foreground mb-2.5 block">
                1. Select Network
              </Label>
              <NetworkSelector
                networks={networks}
                selected={network}
                onSelect={handleNetworkSelect}
              />
            </section>

            {/* Plan selection */}
            {network && (
              <section className="animate-fade-in">
                <Label className="text-sm font-semibold text-foreground mb-2.5 block">
                  2. Choose Plan
                </Label>
                <PlanSelector
                  plans={filteredPlans}
                  selected={plan}
                  onSelect={setPlan}
                />
              </section>
            )}

            {/* Phone & details */}
            {plan && (
              <section className="animate-fade-in space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-foreground mb-2.5 block">
                    3. Recipient Details
                  </Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="phone" className="text-xs text-muted-foreground">
                        Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="08012345678"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`mt-1 text-base ${phoneError ? "border-destructive" : ""}`}
                        maxLength={11}
                      />
                      {phoneError && (
                        <p className="text-xs text-destructive mt-1">{phoneError}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="name" className="text-xs text-muted-foreground">Name (optional)</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="mt-1"
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-xs text-muted-foreground">Email (optional)</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="mt-1"
                          maxLength={255}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live summary */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {network} — {plan.volume}
                      </span>
                      <span className="font-bold text-foreground">
                        ₦{Number(plan.amount).toLocaleString()}
                      </span>
                    </div>
                    {phoneNumber && (
                      <p className="text-xs text-muted-foreground mt-1">To: {phoneNumber}</p>
                    )}
                  </CardContent>
                </Card>

                <Button
                  onClick={handleReview}
                  className="w-full h-11"
                  disabled={!canProceed}
                >
                  Review Order
                </Button>
              </section>
            )}
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && network && plan && (
          <OrderReview
            network={network}
            plan={plan}
            phoneNumber={phoneNumber}
            customerName={customerName || undefined}
            customerEmail={customerEmail || undefined}
            onBack={() => setStep("select")}
            onConfirm={handleConfirm}
            loading={submitting}
          />
        )}

        {/* Step: Created */}
        {step === "created" && intent && (
          <IntentCreated intent={intent} onNewOrder={resetFlow} />
        )}
      </div>
    </div>
  );
}
