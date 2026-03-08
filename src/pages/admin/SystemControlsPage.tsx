/**
 * Admin System Controls Page
 * Reads and manages system settings from the database.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/auth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Setting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_group: string | null;
  description: string | null;
}

export default function SystemControlsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase
      .from("system_settings")
      .select("*")
      .order("setting_group", { ascending: true });
    setSettings(data || []);
    setLoading(false);
  }

  const isBoolSetting = (val: string) => val === "true" || val === "false";

  async function updateSetting(key: string, value: string) {
    setSaving(key);
    const { error } = await supabase
      .from("system_settings")
      .update({ setting_value: value })
      .eq("setting_key", key);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `${key} has been updated.` });
      await writeAuditLog({
        action: "setting_changed",
        targetType: "system_settings",
        targetId: key,
        metadata: { new_value: value },
      });
      // Update local state
      setSettings(prev => prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s));
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Group settings
  const groups = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    const g = s.setting_group || "general";
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="System Controls"
        description="Manage platform-wide settings and feature flags"
      />

      <div className="space-y-6">
        {Object.entries(groups).map(([group, items]) => (
          <Card key={group}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                {group}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((setting) => (
                <div key={setting.setting_key} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium">{setting.setting_key.replace(/_/g, " ")}</Label>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    )}
                  </div>
                  {isBoolSetting(setting.setting_value) ? (
                    <Switch
                      checked={setting.setting_value === "true"}
                      onCheckedChange={(checked) =>
                        updateSetting(setting.setting_key, checked ? "true" : "false")
                      }
                      disabled={saving === setting.setting_key}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-40 text-xs"
                        defaultValue={setting.setting_value}
                        onBlur={(e) => {
                          if (e.target.value !== setting.setting_value) {
                            updateSetting(setting.setting_key, e.target.value);
                          }
                        }}
                      />
                      {saving === setting.setting_key && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
