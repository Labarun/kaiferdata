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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageLoader } from "@/components/shared/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  approveApplication,
  declineApplication,
  getApplicationDetail,
  markUnderReview,
  reactivateAgent,
  requestChanges,
  suspendAgent,
} from "@/services/agentAdmin";
import type { AgentApplication, AgentProfile, AgentSubscription } from "@/services/agent";
import { CheckCircle2, MessageSquareWarning, XCircle, PauseCircle, PlayCircle, Store } from "lucide-react";

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
  const [note, setNote] = useState("");
  const [activeForm, setActiveForm] = useState<"approve" | "changes" | "decline" | "suspend" | null>(null);

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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agent Application</DialogTitle>
          <DialogDescription>
            Review the application and take action.
          </DialogDescription>
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

            <Separator />

            {/* Applicant */}
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
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Previous admin note</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{application.admin_note}</p>
              </div>
            )}

            {/* Subscriptions */}
            {subscriptions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Subscription history</p>
                <div className="space-y-1.5">
                  {subscriptions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs rounded-md bg-muted/40 px-3 py-2">
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
            )}

            <Separator />

            {/* Action area */}
            {activeForm && (
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
