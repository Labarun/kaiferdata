/**
 * CheckoutSheet — Premium light liquid-glass checkout
 */
import { useState } from "react";
import type { DataPlan } from "@/services/purchaseIntent";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Loader2, ShieldCheck, ArrowRight, Phone, User, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: string | null;
  plan: DataPlan | null;
  phoneNumber: string;
  onPhoneChange: (v: string) => void;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function CheckoutSheet({
  open,
  onOpenChange,
  network,
  plan,
  phoneNumber,
  onPhoneChange,
  customerName,
  onCustomerNameChange,
  customerEmail,
  onCustomerEmailChange,
  onConfirm,
  loading,
}: CheckoutSheetProps) {
  const [phoneError, setPhoneError] = useState("");
  const [step, setStep] = useState<"details" | "review">("details");

  if (!network || !plan) return null;

  const cleanPhone = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 11);
  const handlePhoneInput = (v: string) => {
    const cleaned = cleanPhone(v);
    onPhoneChange(cleaned);
    if (phoneError && cleaned.length >= 10) setPhoneError("");
  };

  const canReview = phoneNumber.length >= 10;

  const handleContinueToReview = () => {
    const cleaned = cleanPhone(phoneNumber);
    if (cleaned.length < 10 || cleaned.length > 11) {
      setPhoneError("Enter a valid phone number (10–11 digits)");
      return;
    }
    setPhoneError("");
    setStep("review");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setStep("details");
    onOpenChange(v);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92vh] bg-[hsl(228_20%_97%/0.97)] backdrop-blur-2xl border-t border-[hsl(228_20%_82%/0.45)]">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/12" />
        </div>

        <div className="overflow-y-auto px-5 pb-8 pt-1">
          <DrawerHeader className="p-0 mb-6">
            <DrawerTitle className="text-[17px] font-bold text-foreground/90 text-center tracking-tight">
              {step === "details" ? "Complete Your Order" : "Review & Confirm"}
            </DrawerTitle>
            <DrawerDescription className="text-[12px] text-muted-foreground/65 text-center mt-1.5">
              {step === "details"
                ? "Enter the recipient details"
                : "Verify everything looks correct"}
            </DrawerDescription>
          </DrawerHeader>

          {/* Plan summary card */}
          <div className="glass-premium rounded-2xl px-4 py-4 mb-6 shimmer-edge overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(38_82%_44%/0.35)]" />
                  <span className="section-label">{network}</span>
                </div>
                <p className="text-sm font-semibold text-foreground/80 mt-2 truncate">
                  {plan.volume}
                  <span className="text-[11px] text-muted-foreground/50 ml-2 font-normal">
                    {plan.plan_name}
                  </span>
                </p>
              </div>
              <p className="text-xl font-bold text-primary shrink-0 tracking-tight">
                GH₵{Number(plan.amount).toLocaleString()}
              </p>
            </div>
          </div>

          {step === "details" && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="checkout-phone" className="text-[11px] text-foreground/45 flex items-center gap-1.5 font-medium">
                  <Phone className="h-3 w-3 text-muted-foreground/50" />
                  Recipient Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0XX XXX XXXX"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneInput(e.target.value)}
                  className={cn(
                    "h-12 text-base rounded-xl tracking-wide bg-[hsl(0_0%_100%/0.55)] border-border/40 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(38_82%_44%/0.08),0_0_0_1px_hsl(38_82%_44%/0.15)]",
                    phoneError && "border-destructive focus-visible:ring-destructive"
                  )}
                  maxLength={11}
                />
                {phoneError && (
                  <p className="text-[10px] text-destructive font-medium">{phoneError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="checkout-name" className="text-[10px] text-muted-foreground/55 flex items-center gap-1 font-medium">
                    <User className="h-3 w-3" /> Name
                  </Label>
                  <Input
                    id="checkout-name"
                    placeholder="Optional"
                    value={customerName}
                    onChange={(e) => onCustomerNameChange(e.target.value)}
                    className="h-11 rounded-xl text-sm bg-[hsl(0_0%_100%/0.55)] border-border/40 focus:border-primary/30"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-email" className="text-[10px] text-muted-foreground/55 flex items-center gap-1 font-medium">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    id="checkout-email"
                    type="email"
                    placeholder="Optional"
                    value={customerEmail}
                    onChange={(e) => onCustomerEmailChange(e.target.value)}
                    className="h-11 rounded-xl text-sm bg-[hsl(0_0%_100%/0.55)] border-border/40 focus:border-primary/30"
                    maxLength={255}
                  />
                </div>
              </div>

              <Button
                onClick={handleContinueToReview}
                className="w-full h-12 rounded-2xl text-[13px] font-semibold mt-1"
                disabled={!canReview}
              >
                Review Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-2xl glass-card divide-y divide-border/25 overflow-hidden">
                <ReviewRow label="Network" value={network} />
                <ReviewRow label="Plan" value={`${plan.volume} — ${plan.plan_name}`} />
                <ReviewRow label="Phone" value={phoneNumber} mono />
                {customerName && <ReviewRow label="Name" value={customerName} />}
                {customerEmail && <ReviewRow label="Email" value={customerEmail} />}
                <div className="flex items-center justify-between px-4 py-4">
                  <span className="text-[11px] text-muted-foreground/65 font-medium">Total</span>
                  <span className="text-xl font-bold text-primary tracking-tight">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-[10.5px] text-muted-foreground/50 px-1">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-success/55" />
                <span className="leading-relaxed">
                  Your order is secured. You'll receive a trackable reference after confirmation.
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="glass"
                  onClick={() => setStep("details")}
                  className="flex-1 h-12 rounded-2xl text-[13px] font-semibold"
                  disabled={loading}
                >
                  Edit
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-[2] h-12 rounded-2xl text-[13px] font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  {loading ? "Processing…" : "Confirm & Pay"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[11px] text-muted-foreground/60 font-medium">{label}</span>
      <span className={cn("text-[13px] text-foreground/75 text-right font-medium", mono && "font-mono tracking-wide")}>
        {value}
      </span>
    </div>
  );
}
