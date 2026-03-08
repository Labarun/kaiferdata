/**
 * User Buy Data Page — Logged-in buy entry connected to public flow
 */
import { useAuth } from "@/contexts/AuthContext";
import { WalletCard } from "@/components/shared/WalletCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Wifi, ExternalLink, Wallet } from "lucide-react";

export default function UserBuyDataPage() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Buy Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Purchase data bundles for any Ghana network</p>
      </div>

      {/* Wallet quick view */}
      <WalletCard />

      {/* Buy options */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer group h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Wifi className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Buy with Paystack</p>
                  <p className="text-xs text-muted-foreground">Pay directly via mobile money or card</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground/40 ml-auto" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use the main checkout to purchase data with Paystack payment. Available for MTN, Telecel, and AirtelTigo.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Buy with Wallet</p>
                <p className="text-xs text-muted-foreground">Use your wallet balance</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Wallet-based purchases coming soon. Top up your wallet and buy data instantly without payment redirects.
            </p>
            <Button variant="outline" size="sm" disabled className="mt-3 text-xs">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent context */}
      <Card>
        <CardContent className="py-4 px-5">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Orders placed while logged in are automatically linked to your account for easy tracking and history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
