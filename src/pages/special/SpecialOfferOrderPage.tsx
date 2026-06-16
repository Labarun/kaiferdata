/**
 * SpecialOfferOrderPage — per-package order form.
 *
 * Enter MTN number → read warnings → acknowledge every point → pay from wallet.
 * A final confirm dialog reiterates the acknowledgements before charging.
 */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Wallet,
  ShieldAlert,
  PhoneCall,
} from "lucide-react";
import {
  fetchSpecialPackage,
  fetchSpecialSettings,
  fetchWalletBalance,
  placeSpecialOrder,
  priceForTier,
  formatGhs,
  bundleTypeLabel,
  normalizeMtnNumber,
  SPECIAL_OFFER_NETWORK,
} from "@/services/specialBundles";
import { useAuth } from "@/contexts/AuthContext";
import { useSpecialBase, useSpecialTier } from "@/hooks/useSpecial";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { SpecialWarnings } from "@/components/special/SpecialWarnings";
import { SpecialAckChecklist } from "@/components/special/SpecialAckChecklist";
import { DeliveryEtaTracker } from "@/components/special/DeliveryEtaTracker";

export default function SpecialOfferOrderPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { base, home } = useSpecialBase();
  const { tier } = useSpecialTier();
  const { toast } = useToast();

  const [number, setNumber] = useState("");
  const [ackAll, setAckAll] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  const { data: pkg, isLoading } = useQuery({
    queryKey: ["special-package", packageId],
    queryFn: () => fetchSpecialPackage(packageId!),
    enabled: !!packageId,
  });
  const { data: settings } = useQuery({ queryKey: ["special-settings"], queryFn: fetchSpecialSettings });
  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: () => fetchWalletBalance(user!.id),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!pkg) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">This bundle is no longer available.</p>
        <Link to={base} className="text-primary text-sm font-medium mt-2 inline-block">
          ← Back to offers
        </Link>
      </div>
    );
  }

  const price = priceForTier(pkg, tier);
  const normalized = normalizeMtnNumber(number);
  const balance = wallet?.balance ?? 0;
  const insufficient = balance < price;
  const walletInactive = wallet ? !wallet.active : false;
  const canSubmit = !!normalized && ackAll && !insufficient && !walletInactive;

  const handleConfirm = async () => {
    if (!normalized) return;
    setPlacing(true);
    try {
      const res = await placeSpecialOrder({ packageId: pkg.id, recipientNumber: normalized });
      setConfirmOpen(false);
      navigate(`${base}/success/${res.order_id}`);
    } catch (e) {
      setConfirmOpen(false);
      toast({
        title: "Order not placed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Link to={base}>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order special bundle</h1>
          <p className="text-[11px] text-muted-foreground">MTN only · paid from wallet</p>
        </div>
      </div>

      {/* Package summary */}
      <div className="glass-wallet-hero rounded-2xl p-5 flex items-center justify-between animate-fade-in animate-stagger-1">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Selected bundle</p>
          <p className="text-xl font-bold text-foreground">{pkg.size_label}</p>
          <p className="text-[12px] text-muted-foreground">
            {pkg.name || bundleTypeLabel(pkg.bundle_type)} · {pkg.network}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Price</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">{formatGhs(price)}</p>
        </div>
      </div>

      {/* Delivery tracker */}
      {settings && <DeliveryEtaTracker eta={settings.eta} className="animate-fade-in animate-stagger-1" />}

      {/* Recipient number */}
      <div className="glass-card rounded-2xl p-4 animate-fade-in animate-stagger-2 space-y-2">
        <Label className="text-[13px] font-semibold flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-primary" /> Recipient MTN number
        </Label>
        <Input
          inputMode="numeric"
          placeholder="0XX XXX XXXX"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="text-base tracking-wide"
        />
        {number && !normalized && (
          <p className="text-[11px] text-destructive">Enter a valid 10-digit MTN number (e.g. 024 123 4567).</p>
        )}
        <p className="text-[11px] text-amber-600 flex items-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 mt-px shrink-0" />
          Double-check this number — there's no SMS confirmation, and bundles sent to a wrong number can't be recovered.
        </p>
      </div>

      {/* Warnings */}
      <div className="animate-fade-in animate-stagger-2">
        <SpecialWarnings />
      </div>

      {/* Acknowledgements */}
      <div className="animate-fade-in animate-stagger-3">
        <SpecialAckChecklist onChange={setAckAll} />
      </div>

      {/* Wallet + pay */}
      <div className="glass-card rounded-2xl p-4 animate-fade-in animate-stagger-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Wallet className="h-4 w-4" /> Wallet balance
          </span>
          <span className={`text-sm font-bold ${insufficient ? "text-destructive" : "text-foreground"}`}>
            {formatGhs(balance)}
          </span>
        </div>

        {walletInactive ? (
          <p className="text-[12px] text-destructive">Your wallet isn't active. Please contact support.</p>
        ) : insufficient ? (
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-center">
            <p className="text-[12px] text-destructive font-medium">
              Not enough balance — you need {formatGhs(price - balance)} more.
            </p>
            <Link
              to="/dashboard/wallet"
              className="text-primary text-[13px] font-semibold mt-1.5 inline-block"
            >
              Top up wallet →
            </Link>
          </div>
        ) : null}

        <Button
          className="w-full h-12 text-base font-semibold rounded-xl"
          disabled={!canSubmit}
          onClick={() => setConfirmOpen(true)}
        >
          Pay {formatGhs(price)} from wallet
        </Button>
        {!ackAll && (
          <p className="text-[11px] text-center text-muted-foreground">
            Tick all the boxes above to enable ordering.
          </p>
        )}
      </div>

      {/* Final confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your special bundle order</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <div className="rounded-xl bg-muted/40 p-3 text-[13px] space-y-1">
                  <Row label="Bundle" value={`${pkg.size_label} (${bundleTypeLabel(pkg.bundle_type)})`} />
                  <Row label="Network" value={SPECIAL_OFFER_NETWORK} />
                  <Row label="Recipient" value={normalized || "—"} mono />
                  <Row label="Amount" value={formatGhs(price)} strong />
                </div>
                <p className="text-[12px] text-muted-foreground">
                  By confirming, you agree this is an MTN-only bundle with{" "}
                  <span className="font-semibold text-foreground">no SMS confirmation</span>, delivery may take longer
                  than usual, and unprocessable orders are refunded to your wallet.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={placing}>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={placing}
            >
              {placing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Placing…
                </>
              ) : (
                "Confirm & pay"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${strong ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
