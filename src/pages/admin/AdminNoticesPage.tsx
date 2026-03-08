/**
 * Admin Notices Page - CRUD for system notices
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Notice = Database["public"]["Tables"]["notices"]["Row"];
type NoticeType = Database["public"]["Enums"]["notice_type"];
type NoticeAudience = Database["public"]["Enums"]["notice_audience"];

const NOTICE_TYPES: NoticeType[] = ["service_notice", "maintenance_notice", "info_notice", "warning_notice"];
const AUDIENCES: NoticeAudience[] = ["public", "users", "agents", "staff", "admins", "all"];

export default function AdminNoticesPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [noticeType, setNoticeType] = useState<NoticeType>("info_notice");
  const [audience, setAudience] = useState<NoticeAudience>("all");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchNotices(); }, []);

  async function fetchNotices() {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    setNotices(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setTitle(""); setBody(""); setNoticeType("info_notice"); setAudience("all"); setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(notice: Notice) {
    setEditing(notice);
    setTitle(notice.title); setBody(notice.body); setNoticeType(notice.notice_type);
    setAudience(notice.audience); setIsActive(notice.is_active);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("notices")
        .update({ title, body, notice_type: noticeType, audience, is_active: isActive })
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Notice updated" });
        await writeAuditLog({ action: "notice_updated", targetType: "notices", targetId: editing.id });
      }
    } else {
      const { error } = await supabase
        .from("notices")
        .insert({ title, body, notice_type: noticeType, audience, is_active: isActive, created_by: user?.id });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Notice created" });
        await writeAuditLog({ action: "notice_created", targetType: "notices" });
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchNotices();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notices"
        description="Manage platform notices and announcements"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New Notice
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Notice" : "Create Notice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={noticeType} onValueChange={v => setNoticeType(v as NoticeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTICE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={v => setAudience(v as NoticeAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
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

      {/* Notices list */}
      <div className="space-y-3">
        {notices.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No notices yet.</CardContent></Card>
        )}
        {notices.map((notice) => (
          <Card key={notice.id} className={notice.is_active ? "" : "opacity-60"}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium text-foreground">{notice.title}</p>
                  <Badge variant="outline" className="text-xs">{notice.notice_type.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="text-xs">{notice.audience}</Badge>
                  {!notice.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                </div>
                {notice.body && <p className="text-xs text-muted-foreground">{notice.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(notice.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(notice)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
