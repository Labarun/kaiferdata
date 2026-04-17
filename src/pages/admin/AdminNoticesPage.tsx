/**
 * Admin Notices Page - Full CRUD for system notices with audit logs
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Notice = Database["public"]["Tables"]["notices"]["Row"];
type NoticeType = Database["public"]["Enums"]["notice_type"];
type NoticeAudience = Database["public"]["Enums"]["notice_audience"];

const NOTICE_TYPES: NoticeType[] = ["service_notice", "maintenance_notice", "info_notice", "warning_notice"];
const AUDIENCES: NoticeAudience[] = ["public", "users", "agents", "staff", "admins", "all"];

const typeStyle: Record<NoticeType, string> = {
  info_notice: "bg-info/10 text-info border-info/20",
  service_notice: "bg-primary/10 text-primary border-primary/20",
  warning_notice: "bg-warning/10 text-warning border-warning/20",
  maintenance_notice: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminNoticesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [noticeType, setNoticeType] = useState<NoticeType>("info_notice");
  const [audience, setAudience] = useState<NoticeAudience>("all");
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
    setNotices(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchNotices(); }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle(""); setBody(""); setNoticeType("info_notice"); setAudience("all");
    setIsActive(true); setStartsAt(""); setEndsAt("");
    setDialogOpen(true);
  };
  const openEdit = (n: Notice) => {
    setEditing(n);
    setTitle(n.title); setBody(n.body); setNoticeType(n.notice_type);
    setAudience(n.audience); setIsActive(n.is_active);
    setStartsAt(n.starts_at ? n.starts_at.slice(0, 16) : "");
    setEndsAt(n.ends_at ? n.ends_at.slice(0, 16) : "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title, body, notice_type: noticeType, audience, is_active: isActive,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };
    if (editing) {
      const { error } = await supabase.from("notices").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Notice updated" });
        await writeAuditLog({ action: "notice_updated", targetType: "notices", targetId: editing.id });
      }
    } else {
      const { error } = await supabase.from("notices").insert({ ...payload, created_by: user?.id });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Notice created" }); await writeAuditLog({ action: "notice_created", targetType: "notices" }); }
    }
    setSaving(false); setDialogOpen(false); fetchNotices();
  };

  const toggleActive = async (n: Notice) => {
    const { error } = await supabase.from("notices").update({ is_active: !n.is_active }).eq("id", n.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: n.is_active ? "Notice deactivated" : "Notice activated" });
      await writeAuditLog({ action: "notice_toggled", targetType: "notices", targetId: n.id, metadata: { active: !n.is_active } });
      fetchNotices();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("notices").delete().eq("id", deleteId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Notice deleted" });
      await writeAuditLog({ action: "notice_deleted", targetType: "notices", targetId: deleteId });
      setDeleteId(null); fetchNotices();
    }
  };

  const visible = notices.filter((n) =>
    filter === "all" ? true : filter === "active" ? n.is_active : !n.is_active);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Notices" description="Manage platform announcements"
        actions={<Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> New</Button>} />

      <div className="flex gap-1.5 mb-4">
        {(["all", "active", "inactive"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Notice" : "Create Notice"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={noticeType} onValueChange={(v) => setNoticeType(v as NoticeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as NoticeAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Starts at (optional)</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Ends at (optional)</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving || !title}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this notice?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No notices.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((n) => (
            <Card key={n.id} className={n.is_active ? "" : "opacity-60"}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${typeStyle[n.notice_type]}`}>
                      {n.notice_type.replace("_notice", "")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{n.audience}</Badge>
                    {!n.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Switch checked={n.is_active} onCheckedChange={() => toggleActive(n)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(n)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(n.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
