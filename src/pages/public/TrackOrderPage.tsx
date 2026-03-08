/**
 * TrackOrderPage - Public order tracking entry point
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { lookupIntent, type PurchaseIntent } from "@/services/purchaseIntent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Package, AlertCircle } from "lucide-react";

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<PurchaseIntent | null>(null);

  // Auto-search if ref param exists
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReference(ref);
      handleSearch(ref);
    }
  }, []);

  async function handleSearch(ref?: string) {
    const searchRef = (ref || reference).trim();
    if (!searchRef) return;
    setLoading(true);
    setSearched(true);
    const intent = await lookupIntent(searchRef);
    setResult(intent);
    setLoading(false);
  }

  const snapshot = result?.plan_snapshot as Record<string, unknown> | null;

  return (
    <div className="container py-6 sm:py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Track Your Order</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter your order reference to check the status of your purchase.
          </p>
        </div>

        {/* Search form */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-3">
              <div>
                <Label htmlFor="ref" className="text-xs text-muted-foreground">Order Reference</Label>
                <Input
                  id="ref"
                  placeholder="KD-XXXXXXXX-XXXXXX"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  className="mt-1 font-mono text-sm"
                  maxLength={30}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                className="w-full"
                disabled={loading || !reference.trim()}
              >
                {loading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-4 w-4" />
                )}
                Track Order
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && !loading && !result && (
          <Card className="border-destructive/20">
            <CardContent className="p-5 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Order not found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check your reference and try again. References look like KD-XXXXXXXX-XXXXXX.
              </p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="animate-fade-in">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Order Details</h3>
              </div>
              <div className="space-y-2.5 text-sm">
                <TrackRow label="Reference" value={result.intent_reference} mono />
                <TrackRow label="Status" value={result.status.replace(/_/g, " ")} capitalize />
                <TrackRow label="Network" value={result.network} />
                <TrackRow label="Plan" value={`${String(snapshot?.volume || "")} — ${String(snapshot?.plan_name || "")}`} />
                <TrackRow label="Phone" value={result.phone_number} />
                <TrackRow label="Amount" value={`₦${Number(result.amount_expected).toLocaleString()}`} bold />
                <TrackRow label="Created" value={new Date(result.created_at).toLocaleString()} />
                {result.expires_at && (
                  <TrackRow label="Expires" value={new Date(result.expires_at).toLocaleString()} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help text */}
        {!searched && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Your order reference was provided when you created your purchase. If you've lost it, contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackRow({ label, value, mono, bold, capitalize: cap }: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground ${mono ? "font-mono" : ""} ${bold ? "font-bold" : "font-medium"} ${cap ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}
