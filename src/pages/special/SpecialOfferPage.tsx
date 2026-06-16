/**
 * SpecialOfferPage — landing for the MTN-only special bundle offer.
 *
 * Mounted under both `/dashboard/special` (users) and `/agent/special` (agents).
 * Logged-in only. Wallet-only purchase. Clearly framed as a different kind of
 * bundle before the user ever reaches the order form.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Sparkles, ChevronRight, Receipt, Wifi, Tag } from "lucide-react";
import {
  fetchActiveSpecialPackages,
  fetchSpecialSettings,
  priceForTier,
  formatGhs,
  bundleTypeLabel,
  type SpecialBundlePackage,
} from "@/services/specialBundles";
import { DeliveryEtaTracker } from "@/components/special/DeliveryEtaTracker";
import { useSpecialBase, useSpecialTier } from "@/hooks/useSpecial";
import { cn } from "@/lib/utils";

export default function SpecialOfferPage() {
  const navigate = useNavigate();
  const { base } = useSpecialBase();
  const { tier } = useSpecialTier();

  const { data: settings } = useQuery({ queryKey: ["special-settings"], queryFn: fetchSpecialSettings });
  const { data: packages, isLoading } = useQuery({
    queryKey: ["special-packages-active"],
    queryFn: fetchActiveSpecialPackages,
  });

  const offerEnabled = settings?.offerEnabled !== false;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl glass-wallet-hero p-5 animate-fade-in">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> New special offer
          </span>
          <h1 className="text-xl font-bold text-foreground tracking-tight">MTN Special Bundles</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed max-w-md">
            Cheaper MTN data (and a data + airtime combo), paid from your wallet. This is a{" "}
            <span className="font-semibold text-foreground">different type of bundle</span> — it's delivered manually
            and does <span className="font-semibold text-foreground">not</span> send an SMS confirmation. Please read
            the details on the next screen before ordering.
          </p>
        </div>
      </div>

      {/* Delivery tracker */}
      {settings && <DeliveryEtaTracker eta={settings.eta} className="animate-fade-in animate-stagger-1" />}

      {/* My orders shortcut */}
      <Link
        to={`${base}/orders`}
        className="flex items-center justify-between glass-card rounded-xl px-4 py-3 hover:bg-primary/5 transition-colors animate-fade-in animate-stagger-1"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <Receipt className="h-4 w-4 text-primary" /> My special orders
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* Packages */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !offerEnabled ? (
        <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
          <p className="text-sm font-semibold text-foreground">This offer is paused right now</p>
          <p className="text-[13px] text-muted-foreground mt-1">Please check back again shortly.</p>
        </div>
      ) : !packages || packages.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
          <p className="text-sm font-semibold text-foreground">No bundles available yet</p>
          <p className="text-[13px] text-muted-foreground mt-1">New special bundles will appear here soon.</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in animate-stagger-2">
          {packages.map((pkg) => (
            <PackageRow key={pkg.id} pkg={pkg} price={priceForTier(pkg, tier)} onClick={() => navigate(`${base}/buy/${pkg.id}`)} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-center text-muted-foreground/70 px-4">
        Paid from your wallet balance · MTN only · No SMS confirmation
      </p>
    </div>
  );
}

function PackageRow({
  pkg,
  price,
  onClick,
}: {
  pkg: SpecialBundlePackage;
  price: number;
  onClick: () => void;
}) {
  const isCombo = pkg.bundle_type === "data_airtime";
  return (
    <button
      onClick={onClick}
      className="w-full text-left glass-card rounded-2xl p-4 flex items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
            isCombo ? "bg-primary/10" : "bg-amber-500/10",
          )}
        >
          {isCombo ? <Tag className="h-5 w-5 text-primary" /> : <Wifi className="h-5 w-5 text-amber-500" />}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-foreground truncate">{pkg.size_label}</p>
          <p className="text-[11.5px] text-muted-foreground truncate">
            {pkg.name || bundleTypeLabel(pkg.bundle_type)} · {pkg.network}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-foreground tracking-tight">{formatGhs(price)}</p>
        <p className="text-[10.5px] text-primary font-medium flex items-center justify-end gap-0.5">
          Order <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </p>
      </div>
    </button>
  );
}
