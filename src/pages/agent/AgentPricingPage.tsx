/**
 * Agent Pricing Page — /agent/pricing
 * Per-bundle full selling price entry with auto profit calculation.
 * Gated behind <SubscriptionGate>.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Search, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionGate } from "@/components/agent/SubscriptionGate";
import { fetchAgentPricingMatrix, saveAgentBundlePrice, type PricingRow } from "@/services/agentPricing";

const NETWORKS = ["MTN", "Telecel", "AirtelTigo"];
const fmt = (n: number) => `${n.toFixed(2)}`;

export default function AgentPricingPage() {
  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader
        title="Pricing"
        description="Set the full selling price you want to charge customers for each bundle. Profit is calculated automatically."
      />
      <SubscriptionGate message="Subscribe to set your pricing and publish your storefront.">
        <PricingInner />
      </SubscriptionGate>
    </div>
  );
}

function PricingInner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [networkTab, setNetworkTab] = useState<string>("MTN");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from("agent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      setLoading(false);
      return;
    }
    const matrix = await fetchAgentPricingMatrix(profile.id);
    setRows(matrix);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.pkg.network !== networkTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.pkg.package_name.toLowerCase().includes(q) ||
          r.pkg.package_size_label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, networkTab, search]);

  const [savedFlash, setSavedFlash] = useState<Record<string, number>>({});

  const handleSave = async (row: PricingRow) => {
    const raw = edits[row.pkg.id] ?? (row.selling != null ? String(row.selling) : String(row.base));
    const value = Number(raw);
    if (!Number.isFinite(value) || value < row.base) {
      toast({ title: "Invalid price", description: `Must be ≥ GH₵ ${fmt(row.base)} (your cost).`, variant: "destructive" });
      return;
    }
    setSavingId(row.pkg.id);
    try {
      await saveAgentBundlePrice(row.pkg.id, value);
      // Optimistic in-place update — DO NOT refetch the whole matrix (causes
      // jarring full-page rebuild). Just patch this row so the saved value
      // remains visible immediately.
      setRows((prev) =>
        prev.map((r) =>
          r.pkg.id === row.pkg.id
            ? {
                ...r,
                selling: value,
                profit: Math.max(value - r.base, 0),
                isPublished: true,
              }
            : r,
        ),
      );
      // Sync the edit state to the saved value (don't blank it out)
      setEdits((e) => ({ ...e, [row.pkg.id]: String(value) }));
      // Trigger inline success flash on this row
      setSavedFlash((s) => ({ ...s, [row.pkg.id]: Date.now() }));
      toast({ title: "Price saved", description: `${row.pkg.network} ${row.pkg.package_size_label} → GH₵ ${fmt(value)}` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;
  }

  if (rows.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
        No resaleable packages available right now. An admin must enable bundles for agent resale.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Network tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {NETWORKS.map((n) => (
          <button
            key={n}
            onClick={() => setNetworkTab(n)}
            className={`shrink-0 px-3.5 h-9 rounded-full text-xs font-semibold transition-colors ${
              networkTab === n ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bundles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-base md:text-sm"
        />
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No bundles match.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const editValue = edits[row.pkg.id];
            const display = editValue !== undefined ? editValue : (row.selling != null ? String(row.selling) : String(row.base));
            const numeric = Number(display);
            const profit = Number.isFinite(numeric) ? Math.max(numeric - row.base, 0) : 0;
            const dirty = editValue !== undefined && editValue !== "" && Number(editValue) !== row.selling;
            const belowBase = Number.isFinite(numeric) && numeric < row.base;
            const flashedAt = savedFlash[row.pkg.id];
            const justSaved = flashedAt && Date.now() - flashedAt < 2500;

            return (
              <Card key={row.pkg.id} className="glass-card rounded-xl">
                <CardContent className="p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{row.pkg.network}</Badge>
                        <p className="text-sm font-bold text-foreground truncate">{row.pkg.package_size_label}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {row.pkg.package_name}{row.pkg.validity_label ? ` · ${row.pkg.validity_label}` : ""}
                      </p>
                    </div>
                    {row.isPublished && (
                      <Badge variant="secondary" className="text-[9px] bg-success/10 text-success border-success/20">Live</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground/65 font-semibold">Your cost</p>
                      <p className="text-[13px] font-semibold tabular-nums">GH₵ {fmt(row.base)}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground/65 font-semibold">Selling price</p>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={row.base}
                        value={display}
                        onChange={(e) => setEdits((eds) => ({ ...eds, [row.pkg.id]: e.target.value }))}
                        className="h-9 text-base md:text-sm font-bold tabular-nums px-2"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[9.5px] uppercase tracking-wider text-success/80 font-semibold">Profit</p>
                      <p className="text-[14px] font-bold tabular-nums text-success flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {fmt(profit)}
                      </p>
                    </div>
                  </div>

                  {belowBase && (
                    <div className="flex items-center gap-1.5 text-[11px] text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Cannot be below your cost.
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={() => handleSave(row)}
                    disabled={savingId === row.pkg.id || belowBase || (!dirty && row.selling != null && !justSaved)}
                    variant={justSaved ? "secondary" : "default"}
                    className={`w-full transition-colors ${justSaved ? "!bg-success/15 !text-success hover:!bg-success/20" : ""}`}
                  >
                    {savingId === row.pkg.id ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
                    ) : justSaved ? (
                      <>✓ Saved</>
                    ) : row.selling == null ? (
                      <><Save className="h-3.5 w-3.5 mr-1.5" /> Publish price</>
                    ) : (
                      <><Save className="h-3.5 w-3.5 mr-1.5" /> Update</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
