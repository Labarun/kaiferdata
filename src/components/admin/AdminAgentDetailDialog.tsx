/**
 * Admin Agent Detail Dialog
 *
 * Shows full application + profile + subscription info, plus admin actions:
 *  - Approve (creates profile, flips to pending_subscription)
 *  - Request changes
 *  - Decline
 *  - Suspend / Reactivate (for existing profiles)
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  adminActivateAgent,
  approveApplication,
  declineApplication,
  getApplicationDetail,
  markUnderReview,
  reactivateAgent,
  requestChanges,
  suspendAgent,
} from "@/services/agentAdmin";
import type { AgentApplication, AgentProfile, AgentSubscription } from "@/services/agent";
import { CheckCircle2, MessageSquareWarning, XCircle, PauseCircle, PlayCircle, Store, Zap, DollarSign, Percent, ShoppingCart, Activity, ExternalLink, Wallet } from "lucide-react";

interface Props {
  applicationId: string;
  onClose: () => void;
  onChanged: () => void;
}

export function AdminAgentDetailDialog({ applicationId, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [application, setApplication] = useState<AgentApplication | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<AgentSubscription[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, successRate: 0, earningsBalance: 0, totalEarned: 0, personalBalance: 0 });
  const [activeTab, setActiveTab] = useState<"profile" | "transactions" | "subscription">("profile");
  const [note, setNote] = useState("");
  const [activeForm, setActiveForm] = useState<"approve" | "changes" | "decline" | "suspend" | "activate" | null>(null);
  const [activatePlan, setActivatePlan] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const detail = await getApplicationDetail(applicationId);
        if (cancelled) return;
        setApplication(detail.application);
        setProfile(detail.profile);
        setSubscriptions(detail.subscriptions);
        
        if (detail.application.user_id) {
          const [ordersRes, earningsWalletRes, personalWalletRes] = await Promise.all([
            supabase.from("orders").select("id, public_order_id, status, network, amount_charged, created_at").eq("actor_id", detail.application.user_id).eq("actor_type", "agent").order("created_at", { ascending: false }),
            supabase.from("agent_earnings_wallets").select("current_balance, total_earned").eq("user_id", detail.application.user_id).maybeSingle(),
            supabase.from("wallets").select("current_balance").eq("user_id", detail.application.user_id).maybeSingle()
          ]);
          
          const allOrders = ordersRes.data || [];
          setRecentOrders(allOrders.slice(0, 15)); // Keep up to 15 for transaction tab
          
          const totalOrders = allOrders.length;
          const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
          const successRate = totalOrders > 0 ? (deliveredOrders.length / totalOrders) * 100 : 0;
          const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.amount_charged || 0), 0);
          
          setStats({ 
            totalOrders, 
            successRate, 
            totalRevenue, 
            earningsBalance: earningsWalletRes.data?.current_balance || 0,
            totalEarned: earningsWalletRes.data?.total_earned || 0,
            personalBalance: personalWalletRes.data?.current_balance || 0
          });
        }

        // Auto-mark under_review the moment an admin opens a fresh submission
        if (detail.application.status === "submitted" && user?.id) {
          await markUnderReview(applicationId, user.id);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, user?.id]);

  const handleApprove = async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      await approveApplication({ applicationId, adminId: user.id, adminNote: note || undefined });
      toast.success("Application approved. Agent profile created.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const handleChanges = async () => {
    if (!user?.id || !note.trim()) {
      toast.error("Please add a note explaining what needs to change.");
      return;
    }
    setBusy(true);
    try {
      await requestChanges({ applicationId, adminId: user.id, adminNote: note.trim() });
      toast.success("Sent back to applicant for changes.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!user?.id || !note.trim()) {
      toast.error("Please add a reason for declining.");
      return;
    }
    setBusy(true);
    try {
      await declineApplication({ applicationId, adminId: user.id, adminNote: note.trim() });
      toast.success("Application declined.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSuspend = async () => {
    if (!user?.id || !profile || !note.trim()) {
      toast.error("Please add a reason for suspending.");
      return;
    }
    setBusy(true);
    try {
      await suspendAgent({ profileId: profile.id, adminId: user.id, reason: note.trim() });
      toast.success("Agent suspended.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReactivate = async () => {
    if (!user?.id || !profile) return;
    setBusy(true);
    try {
      await reactivateAgent({ profileId: profile.id, adminId: user.id });
      toast.success("Agent reactivated. They must renew their subscription.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleManualActivate = async () => {
    if (!user?.id || !application?.user_id) return;
    setBusy(true);
    try {
      const res = await adminActivateAgent({
        targetUserId: application.user_id,
        adminId: user.id,
        plan: activatePlan,
        note: note.trim() || undefined,
      });
      const expires = new Date(res.expiresAt).toLocaleDateString();
      toast.success(
        `Activated for ${activatePlan === "monthly" ? "1 month" : "1 year"} — expires ${expires}`,
      );
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between pr-6">
          <div>
            <DialogTitle>{profile ? "Agent Profile" : "Agent Application"}</DialogTitle>
            <DialogDescription>
              {profile ? "Overview of agent performance and settings." : "Review the application and take action."}
            </DialogDescription>
          </div>
          {profile && profile.status === "active" && application.store_slug && (
            <Button variant="outline" size="sm" asChild className="shrink-0 mt-0">
              <a href={`/store/${application.store_slug}`} target="_blank" rel="noopener noreferrer">
                View Storefront <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          )}
        </DialogHeader>

        {loading || !application ? (
          <PageLoader />
        ) : (
          <div className="space-y-5">
            {/* Store header */}
            <div className="flex items-start gap-3">
              {application.store_logo_url ? (
                <img
                  src={application.store_logo_url}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover bg-muted"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
                  <Store className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">
                    {application.store_name || "Unnamed store"}
                  </h3>
                  <Badge variant="outline">{application.status}</Badge>
                  {profile && <Badge variant="secondary">Profile: {profile.status}</Badge>}
                </div>
                {application.store_slug && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    /store/{application.store_slug}
                  </p>
                )}
                {application.store_tagline && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    {application.store_tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Top Summary Grid (6 Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card className="border-slate-800 bg-muted/30">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Personal Wallet</p>
                  <p className="text-lg font-bold text-foreground">GH₵{stats.personalBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-muted/30">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Earnings Balance</p>
                  <p className="text-lg font-bold text-success">GH₵{stats.earningsBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-muted/30">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5"><Activity className="h-3 w-3" /> Total Commission</p>
                  <p className="text-lg font-bold text-foreground">GH₵{stats.totalEarned.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-muted/30">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Total Sales</p>
                  <p className="text-lg font-bold text-foreground">GH₵{stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-muted/30">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5"><ShoppingCart className="h-3 w-3" /> Total Orders</p>
                  <p className="text-lg font-bold text-foreground">{stats.totalOrders}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-muted/30">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5"><Percent className="h-3 w-3" /> Success Rate</p>
                  <p className="text-lg font-bold text-foreground">{Math.round(stats.successRate)}%</p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="subscription">Actions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4">
                <DetailGrid
                  items={[
                    ["Full name", application.full_name],
                    ["Email", application.email],
                    ["Phone", application.phone],
                    ["City", application.city],
                    ["Business name", application.business_name],
                    ["Selling channels", application.selling_channels],
                    ["Customer base", application.expected_customer_base],
                    ["Sold data before", application.has_sold_data_before ? "Yes" : "No"],
                    ["Social link", application.social_link],
                    ["Submitted", application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "—"],
                  ]}
                />
                {application.motivation && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Motivation</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{application.motivation}</p>
                  </div>
                )}
                {application.admin_note && (
                  <div className="rounded-lg border border-slate-800 bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Previous admin note</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{application.admin_note}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transactions">
                {recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No transaction history found.</div>
                ) : (
                  <div className="rounded-md border border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-4 bg-muted/40 p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div>Order ID</div>
                      <div>Network</div>
                      <div>Amount</div>
                      <div className="text-right">Status</div>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {recentOrders.map(o => (
                        <div key={o.id} className="grid grid-cols-4 p-3 text-xs items-center hover:bg-muted/20 transition-colors">
                          <div className="font-mono text-foreground">{o.public_order_id}</div>
                          <div className="text-muted-foreground">{o.network}</div>
                          <div className="font-medium">GH₵{Number(o.amount_charged).toFixed(2)}</div>
                          <div className="text-right">
                            <Badge variant={o.status === 'delivered' ? 'default' : o.status === 'failed' ? 'destructive' : 'outline'} className="text-[10px]">
                              {o.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="subscription" className="space-y-6">
                {/* Subscriptions */}
                {subscriptions.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Subscription history</p>
                    <div className="space-y-1.5">
                      {subscriptions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs rounded-md bg-muted/40 border border-slate-800 px-3 py-2">
                          <div>
                            <span className="font-medium capitalize">{s.plan}</span>
                            <span className="text-muted-foreground ml-2">GH₵{Number(s.amount_paid).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={s.status === "active" ? "default" : "outline"} className="text-[10px]">
                              {s.status}
                            </Badge>
                            {s.expires_at && (
                              <span className="text-muted-foreground">
                                until {new Date(s.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No subscription history.</p>
                )}
                
                <Separator className="bg-slate-800" />

                {/* Action area */}
                {activeForm === "activate" && (
                  <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Manual activation</p>
                      <p className="text-xs text-muted-foreground">
                        Activates this agent's store immediately, even without a Paystack payment.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={activatePlan === "monthly" ? "default" : "outline"}
                        onClick={() => setActivatePlan("monthly")}
                        disabled={busy}
                      >
                        1 Month
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={activatePlan === "yearly" ? "default" : "outline"}
                        onClick={() => setActivatePlan("yearly")}
                        disabled={busy}
                      >
                        1 Year
                      </Button>
                    </div>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Optional internal note (audit log)"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setActiveForm(null); setNote(""); }} disabled={busy}>
                        Cancel
                      </Button>
                      <Button size="sm" disabled={busy} onClick={handleManualActivate}>
                        <Zap className="mr-1 h-4 w-4" />
                        {busy ? "Activating…" : `Activate ${activatePlan === "monthly" ? "1 Month" : "1 Year"}`}
                      </Button>
                    </div>
                  </div>
                )}

                {activeForm && activeForm !== "activate" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {activeForm === "approve" ? "Optional internal note" : "Note (required)"}
                    </label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder={
                        activeForm === "changes"
                          ? "What does the applicant need to fix?"
                          : activeForm === "decline"
                          ? "Reason for declining (visible to applicant)"
                          : activeForm === "suspend"
                          ? "Reason for suspending this agent"
                          : "Optional note"
                      }
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setActiveForm(null); setNote(""); }} disabled={busy}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant={activeForm === "decline" || activeForm === "suspend" ? "destructive" : "default"}
                        disabled={busy}
                        onClick={
                          activeForm === "approve" ? handleApprove :
                          activeForm === "changes" ? handleChanges :
                          activeForm === "decline" ? handleDecline :
                          handleSuspend
                        }
                      >
                        {busy ? "Working…" :
                          activeForm === "approve" ? "Confirm approval" :
                          activeForm === "changes" ? "Send back" :
                          activeForm === "decline" ? "Decline" :
                          "Suspend agent"}
                      </Button>
                    </div>
                  </div>
                )}

                {!activeForm && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {/* Application-level actions */}
                    {(application.status === "submitted" || application.status === "under_review" || application.status === "needs_changes") && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setActiveForm("changes")}>
                          <MessageSquareWarning className="mr-1 h-4 w-4" />
                          Request changes
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setActiveForm("decline")}>
                          <XCircle className="mr-1 h-4 w-4" />
                          Decline
                        </Button>
                        <Button size="sm" onClick={() => setActiveForm("approve")}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                      </>
                    )}

                    {/* Manual admin activation — available for approved agents
                        that aren't currently 'active' (and aren't suspended). */}
                    {profile && profile.status !== "active" && profile.status !== "suspended" && (
                      <Button size="sm" variant="default" onClick={() => setActiveForm("activate")}>
                        <Zap className="mr-1 h-4 w-4" />
                        Manually activate
                      </Button>
                    )}

                    {/* Allow extending an already-active agent too */}
                    {profile && profile.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => setActiveForm("activate")}>
                        <Zap className="mr-1 h-4 w-4" />
                        Extend activation
                      </Button>
                    )}

                    {/* Profile-level actions */}
                    {profile && profile.status !== "suspended" && (
                      <Button variant="destructive" size="sm" onClick={() => setActiveForm("suspend")}>
                        <PauseCircle className="mr-1 h-4 w-4" />
                        Suspend agent
                      </Button>
                    )}
                    {profile && profile.status === "suspended" && (
                      <Button size="sm" onClick={handleReactivate} disabled={busy}>
                        <PlayCircle className="mr-1 h-4 w-4" />
                        Reactivate
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailGrid({ items }: { items: [string, string | null | undefined][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-sm text-foreground break-words">{value || "—"}</p>
        </div>
      ))}
    </div>
  );
}
