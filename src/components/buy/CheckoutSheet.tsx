/**
 * CheckoutSheet - Premium bottom-sheet checkout on mobile, drawer on desktop
 * Contains phone input, optional fields, review summary, and confirm CTA
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
      <DrawerContent className="max-h-[92vh]">
        <div className="overflow-y-auto px-5 pb-6 pt-2">
          <DrawerHeader className="p-0 mb-4">
            <DrawerTitle className="text-base font-extrabold text-foreground text-center">
              {step === "details" ? "Complete Your Order" : "Review & Confirm"}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground text-center">
              {step === "details"
                ? "Enter the recipient details below"
                : "Verify everything looks correct"}
            </DrawerDescription>
          </DrawerHeader>

          {/* Plan summary strip */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 border border-border/60 px-3.5 py-3 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary shrink-0" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {network}
                </span>
              </div>
              <p className="text-sm font-bold text-foreground mt-0.5 truncate">
                {plan.volume}
                <span className="text-xs font-medium text-muted-foreground ml-1.5">
                  {plan.plan_name}
                </span>
              </p>
            </div>
            <p className="text-lg font-extrabold text-primary shrink-0">
              GH₵{Number(plan.amount).toLocaleString()}
            </p>
          </div>

          {step === "details" && (
            <div className="space-y-4 animate-fade-in">
              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="checkout-phone" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Recipient Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0XX XXX XXXX"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneInput(e.target.value)}
                  className={`h-12 text-base rounded-xl font-semibold tracking-wide ${
                    phoneError ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  maxLength={11}
                />
                {phoneError && (
                  <p className="text-[11px] text-destructive font-medium">{phoneError}</p>
                )}
              </div>

              {/* Optional fields — collapsed row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-name" className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Name
                  </Label>
                  <Input
                    id="checkout-name"
                    placeholder="Optional"
                    value={customerName}
                    onChange={(e) => onCustomerNameChange(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-email" className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    id="checkout-email"
                    type="email"
                    placeholder="Optional"
                    value={customerEmail}
                    onChange={(e) => onCustomerEmailChange(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                    maxLength={255}
                  />
                </div>
              </div>

              <Button
                onClick={handleContinueToReview}
                className="w-full h-12 rounded-xl text-sm font-bold shadow-sm"
                disabled={!canReview}
              >
                Review Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4 animate-fade-in">
              {/* Review rows */}
              <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40">
                <ReviewRow label="Network" value={network} />
                <ReviewRow label="Plan" value={`${plan.volume} — ${plan.plan_name}`} />
                <ReviewRow label="Phone" value={phoneNumber} mono />
                {customerName && <ReviewRow label="Name" value={customerName} />}
                {customerEmail && <ReviewRow label="Email" value={customerEmail} />}
                <div className="flex items-center justify-between px-3.5 py-3">
                  <span className="text-xs font-semibold text-muted-foreground">Total</span>
                  <span className="text-lg font-extrabold text-primary">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Security */}
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-success" />
                <span>
                  Your order is secured. You'll get a tracking reference after confirmation.
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setStep("details")}
                  className="flex-1 h-11 rounded-xl font-semibold"
                  disabled={loading}
                >
                  Edit
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-[2] h-11 rounded-xl font-bold shadow-sm"
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

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-semibold text-foreground text-right ${
          mono ? "font-mono tracking-wide" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
