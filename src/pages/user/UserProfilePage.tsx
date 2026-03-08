/**
 * User Profile Page — Premium liquid-glass account management
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { AccountStatusBadge } from "@/components/shared/AccountStatusBadge";
import { UserCircle, Save, Loader2, Mail, Phone, Shield } from "lucide-react";
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
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account information</p>
      </div>

      {/* Account hero card */}
      <div className="glass-wallet-hero rounded-2xl p-6 animate-fade-in animate-stagger-1">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <UserCircle className="h-8 w-8 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-foreground truncate">{user.fullName || user.username}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <RoleBadge role={user.role} />
              <AccountStatusBadge status={user.accountStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-2">
        <div className="px-5 py-3.5 border-b border-border/20">
          <h3 className="section-label flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Personal Information</h3>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input value={user.email} disabled className="bg-muted/30 text-sm rounded-xl h-11 border-0" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Username</Label>
            <Input value={user.username} disabled className="bg-muted/30 text-sm rounded-xl h-11 border-0" />
            <p className="text-[10px] text-muted-foreground/50">Username cannot be changed</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-sm rounded-xl h-11 glass-subtle border-0"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Phone Number
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-sm rounded-xl h-11 glass-subtle border-0"
              placeholder="0XX XXX XXXX"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl h-11">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
