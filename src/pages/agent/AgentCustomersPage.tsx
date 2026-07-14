/**
 * Agent Customers — /agent/customers
 * Aggregated unique customer list across all storefront orders + Explicitly saved CRM contacts.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Phone, Repeat, Loader2, Plus, Edit2, Trash2, Bookmark } from "lucide-react";
import { fetchAgentCustomers, saveAgentCustomer, deleteAgentCustomer, type AgentCustomer } from "@/services/agentCustomers";
import { SubscriptionGate } from "@/components/agent/SubscriptionGate";
import { toast } from "sonner";
import { NetworkSelector } from "@/components/buy/NetworkSelector";

const fmt = (n: number) => `GH₵${n.toFixed(2)}`;

export default function AgentCustomersPage() {
  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader title="Customers" description="Manage your address book and track customer spend." />
      <SubscriptionGate message="Subscribe to unlock customer insights and CRM.">
        <CustomersInner />
      </SubscriptionGate>
    </div>
  );
}

function CustomersInner() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<AgentCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingNetwork, setEditingNetwork] = useState("MTN");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;
      setProfileId(profile.id);
      const list = await fetchAgentCustomers(profile.id);
      setCustomers(list);
    } catch (err: any) {
      toast.error(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleSave = async () => {
    if (!profileId || !editingPhone || !editingNetwork) return;
    setIsSaving(true);
    try {
      await saveAgentCustomer(profileId, editingPhone, editingNetwork, editingName);
      toast.success("Customer saved");
      setIsDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (phone: string) => {
    if (!profileId) return;
    if (!confirm("Remove this customer from your saved list?")) return;
    try {
      await deleteAgentCustomer(profileId, phone);
      toast.success("Customer removed from saved list");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const openNew = () => {
    setEditingPhone("");
    setEditingName("");
    setEditingNetwork("MTN");
    setIsDialogOpen(true);
  };

  const openEdit = (c: AgentCustomer) => {
    setEditingPhone(c.beneficiary_number);
    setEditingName(c.name || "");
    setEditingNetwork(c.network || "MTN");
    setIsDialogOpen(true);
  };

  if (loading && !profileId) {
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

      <div className="flex justify-end">
        <Button onClick={openNew} size="sm" className="rounded-full shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" /> Add Customer
        </Button>
      </div>

      {/* List */}
      {customers.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No customers yet</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Add a customer or wait for your first order.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/40">
              {customers.map((c) => {
                const isChurnRisk = c.last_order_at && (Date.now() - new Date(c.last_order_at).getTime()) > 30 * 86_400_000;
                
                return (
                  <li key={c.beneficiary_number} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {c.name || c.beneficiary_number}
                        </p>
                        {c.is_saved && (
                          <Bookmark className="h-3 w-3 text-primary shrink-0" fill="currentColor" />
                        )}
                        {isChurnRisk && (
                          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-transparent px-1.5 py-0">
                            Risk
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground tabular-nums tracking-wide">
                          {c.name ? c.beneficiary_number : ''}
                        </span>
                        <Badge variant="outline" className="text-[9px]">{c.network}</Badge>
                        {c.orders > 1 && (
                          <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">
                            ×{c.orders}
                          </Badge>
                        )}
                      </div>
                      
                      {c.first_order_at && (
                        <p className="text-[9.5px] text-muted-foreground/60 mt-1">
                          Joined: {new Date(c.first_order_at).toLocaleDateString()}
                          {isChurnRisk && c.last_order_at && ` • Last seen: ${new Date(c.last_order_at).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold tabular-nums">{fmt(c.total_spend)}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {c.orders === 0 ? "No orders" : `${c.orders} order${c.orders === 1 ? "" : "s"}`}
                        </p>
                        {c.avg_order_value > 0 && (
                          <p className="text-[9.5px] text-primary/70 font-medium mt-0.5 tabular-nums">
                            {fmt(c.avg_order_value)} avg
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(c)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        {c.is_saved && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => handleDelete(c.beneficiary_number)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPhone && customers.find(c => c.beneficiary_number === editingPhone)?.is_saved ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name (Optional)</Label>
              <Input 
                value={editingName} 
                onChange={e => setEditingName(e.target.value)} 
                placeholder="John Doe" 
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                value={editingPhone} 
                onChange={e => setEditingPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                placeholder="024XXXXXXX" 
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Network</Label>
              <NetworkSelector 
                networks={["MTN", "Telecel", "AirtelTigo"]} 
                selected={editingNetwork} 
                onSelect={setEditingNetwork} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || editingPhone.length < 10}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
