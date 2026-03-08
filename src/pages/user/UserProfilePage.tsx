/**
 * User Profile Page — Account info and settings
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { AccountStatusBadge } from "@/components/shared/AccountStatusBadge";
import { UserCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UserProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated");
      await refreshUser();
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account information</p>
      </div>

      {/* Account summary */}
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{user.fullName || user.username}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={user.role} />
                <AccountStatusBadge status={user.accountStatus} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Username</Label>
            <Input value={user.username} disabled className="bg-muted/50 text-sm" />
            <p className="text-[10px] text-muted-foreground">Username cannot be changed</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={user.email} disabled className="bg-muted/50 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="text-sm" placeholder="0XX XXX XXXX" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
