/**
 * User Buy Data Page — Premium liquid-glass buy entry
 */
import { WalletCard } from "@/components/shared/WalletCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Wifi, ExternalLink, Wallet, Zap, ArrowRight } from "lucide-react";

export default function UserBuyDataPage() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Buy Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Purchase data bundles for any Ghana network</p>
      </div>

      {/* Wallet quick view */}
      <div className="animate-fade-in animate-stagger-1">
        <WalletCard />
      </div>

      {/* Buy options */}
      <div className="grid gap-3 sm:grid-cols-2 animate-fade-in animate-stagger-2">
        <Link to="/">
          <div className="glass-elevated rounded-xl p-5 hover:scale-[1.02] transition-all duration-200 cursor-pointer group h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Wifi className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Buy with Paystack</p>
                <p className="text-[11px] text-muted-foreground">Pay via mobile money or card</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Use the main checkout to purchase data for MTN, Telecel, and AirtelTigo with Paystack.
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-primary">
              <Zap className="h-3 w-3" /> Go to checkout <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>

        <div className="glass-subtle rounded-xl p-5 opacity-70">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-muted">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Buy with Wallet</p>
              <p className="text-[11px] text-muted-foreground">Use your wallet balance</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Wallet-based purchases coming soon. Top up and buy data instantly without payment redirects.
          </p>
          <Button variant="outline" size="sm" disabled className="mt-3 text-xs rounded-lg">
            Coming Soon
          </Button>
        </div>
      </div>

      {/* Tip */}
      <div className="glass-subtle rounded-xl py-3.5 px-4 animate-fade-in animate-stagger-3">
        <p className="text-[11px] text-muted-foreground">
          💡 <strong className="text-foreground">Tip:</strong> Orders placed while logged in are automatically linked to your account for easy tracking.
        </p>
      </div>
    </div>
  );
}
