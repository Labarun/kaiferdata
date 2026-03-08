/**
 * CheckoutSheet — Premium liquid-glass checkout entry surface
 */
import { useState, useEffect, useRef } from "react";
import type { DataPlan } from "@/services/purchaseIntent";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Loader2,
  ShieldCheck,
  ArrowRight,
  Phone,
  User,
  Mail,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Network brand tints ── */
const NET_DOT: Record<string, string> = {
  MTN: "46 100% 46%",
  Telecel: "0 68% 48%",
  AirtelTigo: "212 78% 48%",
};

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
  const phoneRef = useRef<HTMLInputElement>(null);

  // Auto-focus phone input when sheet opens
  useEffect(() => {
    if (open && step === "details") {
      const t = setTimeout(() => phoneRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [open, step]);

  if (!network || !plan) return null;

  const dotHsl = NET_DOT[network] || "38 82% 44%";

  const cleanPhone = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 11);
  const handlePhoneInput = (v: string) => {
    const cleaned = cleanPhone(v);
    onPhoneChange(cleaned);
    if (phoneError && cleaned.length >= 10) setPhoneError("");
  };

  // Format phone for display: 0XX XXX XXXX
  const formatPhone = (p: string) => {
    if (p.length <= 3) return p;
    if (p.length <= 6) return `${p.slice(0, 3)} ${p.slice(3)}`;
    return `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}`;
  };

  const canReview = phoneNumber.length >= 10;

  const handleContinueToReview = () => {
    const cleaned = cleanPhone(phoneNumber);
    if (cleaned.length < 10 || cleaned.length > 11) {
      setPhoneError("Enter a valid Ghana phone number (10–11 digits)");
      return;
    }
    setPhoneError("");
    setStep("review");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setStep("details");
    onOpenChange(v);
  };

  const handleBack = () => setStep("details");

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent
        className={cn(
          "max-h-[94vh] border-0 rounded-t-[28px] overflow-hidden",
          "bg-[hsl(228_22%_97%/0.92)] backdrop-blur-[40px] saturate-[1.8]",
          "shadow-[0_-4px_40px_-8px_hsl(228_30%_40%/0.12),0_-1px_6px_-1px_hsl(228_30%_50%/0.06)]"
        )}
      >
        {/* ── Premium handle ── */}
        <div className="flex justify-center pt-3.5 pb-2">
          <div className="h-[5px] w-10 rounded-full bg-[hsl(228_18%_78%/0.35)]" />
        </div>

        {/* ── Top edge accent — network tinted ── */}
        <div
          className="h-[1px] mx-6"
          style={{
            background: `linear-gradient(90deg, transparent 10%, hsl(${dotHsl} / 0.2) 50%, transparent 90%)`,
          }}
        />

        <div className="overflow-y-auto px-5 pb-8 pt-3">
          {/* ── Header ── */}
          <div className="text-center mb-5">
            {step === "review" && (
              <button
                onClick={handleBack}
                className="absolute left-5 top-14 flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <h2 className="text-[17px] font-bold text-foreground/90 tracking-tight">
              {step === "details" ? "Complete Your Order" : "Review & Confirm"}
            </h2>
            <p className="text-[12px] text-muted-foreground/55 mt-1">
              {step === "details"
                ? "Enter the recipient phone number"
                : "Verify everything looks correct"}
            </p>
          </div>

          {/* ── Selected plan summary card ── */}
          <div className="glass-premium rounded-2xl overflow-hidden mb-6 shimmer-edge">
            <div
              className="h-[2px]"
              style={{
                background: `linear-gradient(90deg, transparent, hsl(${dotHsl} / 0.35), transparent)`,
              }}
            />
            <div className="px-4 py-3.5 flex items-center gap-3">
              {/* Network dot */}
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-[12px] font-bold"
                style={{
                  background: `hsl(${dotHsl} / 0.1)`,
                  color: `hsl(${dotHsl})`,
                  boxShadow: `inset 0 1px 0 0 hsl(0 0% 100% / 0.5), 0 0 0 1px hsl(${dotHsl} / 0.12)`,
                }}
              >
                {network.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {network}
                  </span>
                  <span className="text-[10px] text-muted-foreground/35">·</span>
                  <span className="text-[10px] text-muted-foreground/40 font-medium truncate">
                    {plan.plan_name}
                  </span>
                </div>
                <p className="text-[14px] font-bold text-foreground/80 mt-0.5 tracking-tight">
                  {plan.volume}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[18px] font-bold text-gradient-gold tracking-tight">
                  GH₵{Number(plan.amount).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* ── STEP: Details ── */}
          {step === "details" && (
            <div className="space-y-5 animate-fade-in">
              {/* Phone number — primary input */}
              <div className="space-y-2.5">
                <Label
                  htmlFor="checkout-phone"
                  className="text-[11px] text-foreground/50 flex items-center gap-1.5 font-semibold tracking-wide"
                >
                  <Phone className="h-3 w-3 text-primary/50" />
                  Recipient Phone Number
                </Label>
                <div className="relative">
                  <Input
                    ref={phoneRef}
                    id="checkout-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="024 XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneInput(e.target.value)}
                    className={cn(
                      "h-14 text-[18px] font-semibold tracking-widest rounded-2xl pl-4 pr-12",
                      "bg-[hsl(0_0%_100%/0.6)] border-[hsl(228_20%_84%/0.5)]",
                      "focus:bg-[hsl(0_0%_100%/0.75)] focus:border-primary/25",
                      "focus:shadow-[0_0_0_4px_hsl(38_82%_44%/0.06),0_0_0_1px_hsl(38_82%_44%/0.12),0_4px_16px_-4px_hsl(228_30%_48%/0.08)]",
                      "placeholder:text-muted-foreground/25 placeholder:font-normal placeholder:tracking-wider placeholder:text-[16px]",
                      "transition-all duration-200",
                      phoneError && "border-destructive/40 focus:border-destructive/50 focus:shadow-[0_0_0_4px_hsl(0_62%_50%/0.06)]"
                    )}
                    maxLength={11}
                  />
                  {/* Ghana flag hint */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                    <span className="text-[11px]">🇬🇭</span>
                  </div>
                </div>
                {phoneError ? (
                  <p className="text-[10.5px] text-destructive/80 font-medium pl-0.5">{phoneError}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/35 font-medium pl-0.5">
                    Ghana mobile number where data will be sent
                  </p>
                )}
              </div>

              {/* Optional fields — collapsible feel */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-widest">
                  Optional Details
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="checkout-name"
                      className="text-[10px] text-muted-foreground/45 flex items-center gap-1 font-medium"
                    >
                      <User className="h-2.5 w-2.5" /> Name
                    </Label>
                    <Input
                      id="checkout-name"
                      placeholder="Optional"
                      value={customerName}
                      onChange={(e) => onCustomerNameChange(e.target.value)}
                      className="h-11 rounded-xl text-sm bg-[hsl(0_0%_100%/0.5)] border-[hsl(228_20%_86%/0.45)] focus:border-primary/20 placeholder:text-muted-foreground/25"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="checkout-email"
                      className="text-[10px] text-muted-foreground/45 flex items-center gap-1 font-medium"
                    >
                      <Mail className="h-2.5 w-2.5" /> Email
                    </Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      placeholder="Optional"
                      value={customerEmail}
                      onChange={(e) => onCustomerEmailChange(e.target.value)}
                      className="h-11 rounded-xl text-sm bg-[hsl(0_0%_100%/0.5)] border-[hsl(228_20%_86%/0.45)] focus:border-primary/20 placeholder:text-muted-foreground/25"
                      maxLength={255}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

              {/* CTA */}
              <Button
                onClick={handleContinueToReview}
                className="w-full h-13 rounded-2xl text-[14px] font-semibold"
                disabled={!canReview}
                style={{ height: 52 }}
              >
                Review Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-[9.5px] text-muted-foreground/35 text-center font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-success/45" />
                Secured · No payment taken yet
              </p>
            </div>
          )}

          {/* ── STEP: Review ── */}
          {step === "review" && (
            <div className="space-y-5 animate-fade-in">
              {/* Review rows */}
              <div className="rounded-2xl overflow-hidden glass-card">
                <ReviewRow label="Network" value={network} />
                <ReviewRow label="Bundle" value={plan.volume} />
                <ReviewRow
                  label="Recipient"
                  value={formatPhone(phoneNumber)}
                  mono
                  icon={<span className="text-[10px] mr-1">🇬🇭</span>}
                />
                {customerName && <ReviewRow label="Name" value={customerName} />}
                {customerEmail && <ReviewRow label="Email" value={customerEmail} />}

                {/* Total row — premium */}
                <div className="flex items-center justify-between px-4 py-4 bg-[hsl(38_40%_96%/0.4)]">
                  <span className="text-[11px] text-muted-foreground/55 font-semibold uppercase tracking-wider">
                    Total
                  </span>
                  <span className="text-[22px] font-bold text-gradient-gold tracking-tight">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Trust message */}
              <div className="flex items-start gap-2.5 text-[10.5px] text-muted-foreground/50 px-1">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-success/55" />
                <span className="leading-relaxed">
                  Your order is secured with a unique tracking reference. Data is delivered instantly after confirmation.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5">
                <Button
                  variant="glass"
                  onClick={handleBack}
                  className="flex-1 h-[52px] rounded-2xl text-[13px] font-semibold"
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-[2.2] h-[52px] rounded-2xl text-[14px] font-semibold relative overflow-hidden shimmer-edge"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Confirm & Pay
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ── Review row sub-component ── */
function ReviewRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/15 last:border-b-0">
      <span className="text-[11px] text-muted-foreground/55 font-medium">{label}</span>
      <span
        className={cn(
          "text-[13px] text-foreground/75 text-right font-medium flex items-center",
          mono && "font-mono tracking-wide"
        )}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
