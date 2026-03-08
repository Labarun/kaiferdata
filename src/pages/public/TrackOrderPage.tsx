/**
 * TrackOrderPage - Glass-themed order tracking
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { lookupIntent, type PurchaseIntent } from "@/services/purchaseIntent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Package, AlertCircle } from "lucide-react";

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<PurchaseIntent | null>(null);

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
    <div className="min-h-[70vh]">
      {/* Header */}
      <div className="bg-hero-gradient border-b border-border/20">
        <div className="container py-8 sm:py-10 text-center">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-medium text-hero-foreground">Track Your Order</h1>
          <p className="text-sm text-hero-muted mt-1">Enter your reference to check order status</p>
        </div>
      </div>

      <div className="container py-5 sm:py-7">
        <div className="max-w-md mx-auto">
          {/* Search */}
          <div className="glass-strong rounded-2xl p-5 mb-5">
            <div className="space-y-3">
              <Input
                placeholder="KD-XXXXXXXX-XXXXXX"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                className="h-12 font-mono text-sm rounded-xl text-center bg-accent/30 border-border/40"
                maxLength={30}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={() => handleSearch()}
                className="w-full h-11"
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
          </div>

          {/* Not found */}
          {searched && !loading && !result && (
            <div className="text-center py-8 animate-fade-in">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-destructive/60" />
              </div>
              <p className="text-sm font-medium text-foreground">Order not found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Double-check your reference and try again.
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl glass-subtle p-4 sm:p-5 animate-fade-in space-y-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Order Details</span>
              </div>
              <TrackRow label="Reference" value={result.intent_reference} mono />
              <TrackRow label="Status" value={result.status.replace(/_/g, " ")} badge />
              <TrackRow label="Network" value={result.network} />
              <TrackRow label="Plan" value={`${String(snapshot?.volume || "")} — ${String(snapshot?.plan_name || "")}`} />
              <TrackRow label="Phone" value={result.phone_number} />
              <div className="pt-3 border-t border-border/20">
                <TrackRow label="Amount" value={`GH₵${Number(result.amount_expected).toLocaleString()}`} bold />
              </div>
              <TrackRow label="Created" value={new Date(result.created_at).toLocaleString()} />
              {result.expires_at && (
                <TrackRow label="Expires" value={new Date(result.expires_at).toLocaleString()} />
              )}
            </div>
          )}

          {/* Help text */}
          {!searched && (
            <p className="text-center text-xs text-muted-foreground">
              Your reference was provided when you created your order. Format: KD-XXXXXXXX-XXXXXX
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackRow({ label, value, mono, bold, badge }: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  badge?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {badge ? (
        <span className="text-[11px] capitalize px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
          {value}
        </span>
      ) : (
        <span className={`text-sm text-foreground ${mono ? "font-mono" : ""} ${bold ? "font-medium text-primary" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
