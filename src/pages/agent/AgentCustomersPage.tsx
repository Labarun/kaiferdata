/**
 * Agent Customers — /agent/customers
 * Aggregated unique customer list across all storefront orders.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Repeat, Loader2 } from "lucide-react";
import { fetchAgentCustomers, type AgentCustomer } from "@/services/agentCustomers";
import { SubscriptionGate } from "@/components/agent/SubscriptionGate";

const fmt = (n: number) => `GH₵${n.toFixed(2)}`;

export default function AgentCustomersPage() {
  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader title="Customers" description="People who've bought from your store." />
      <SubscriptionGate message="Subscribe to unlock customer insights.">
        <CustomersInner />
      </SubscriptionGate>
    </div>
  );
}

function CustomersInner() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<AgentCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) { setLoading(false); return; }
      const list = await fetchAgentCustomers(profile.id);
      if (!cancelled) {
        setCustomers(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;
  }

  const repeat = customers.filter((c) => c.orders > 1).length;
  const totalSpend = customers.reduce((s, c) => s + c.total_spend, 0);

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={Users} label="Total" value={String(customers.length)} />
        <StatTile icon={Repeat} label="Repeat" value={String(repeat)} />
        <StatTile icon={Phone} label="Spend" value={fmt(totalSpend)} />
      </div>

      {/* List */}
      {customers.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No customers yet</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Share your store link to get started.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/40">
              {customers.map((c) => (
                <li key={c.beneficiary_number} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold tabular-nums">{c.beneficiary_number}</p>
                      <Badge variant="outline" className="text-[9px]">{c.network}</Badge>
                      {c.orders > 1 && (
                        <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">
                          ×{c.orders}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      Last order {new Date(c.last_order_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold tabular-nums">{fmt(c.total_spend)}</p>
                    <p className="text-[10px] text-muted-foreground/60">{c.orders} order{c.orders === 1 ? "" : "s"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-3 w-3 text-primary" />
          <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground/65 font-semibold">{label}</p>
        </div>
        <p className="text-[15px] font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
