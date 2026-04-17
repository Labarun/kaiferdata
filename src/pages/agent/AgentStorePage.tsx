/**
 * Agent Store Settings — /agent/store
 *
 * Lets the agent edit their public store identity (name, tagline, logo)
 * and copy a shareable storefront link.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Store as StoreIcon,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Upload,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadStoreLogo, type AgentProfile } from "@/services/agent";

export default function AgentStorePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable fields
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("agent_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setProfile(data);
        setStoreName(data.store_name || "");
        setTagline(data.store_tagline || "");
        setLogoUrl(data.store_logo_url);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const storeUrl = profile?.store_slug
    ? `${window.location.origin}/store/${profile.store_slug}`
    : "";

  const handleSave = async () => {
    if (!profile) return;
    if (!storeName.trim()) {
      toast({ title: "Store name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("agent_profiles")
      .update({
        store_name: storeName.trim(),
        store_tagline: tagline.trim() || null,
        store_logo_url: logoUrl,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Store details updated." });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const url = await uploadStoreLogo(user.id, file);
      setLogoUrl(url);
      toast({ title: "Logo uploaded", description: "Don't forget to save." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = async () => {
    if (!storeUrl) return;
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShareWhatsApp = () => {
    if (!storeUrl) return;
    const text = `Buy data fast at ${storeName}! ${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
    );
  }

  if (!profile) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Store" description="No store yet" />
        <Card>
          <CardContent className="py-10 text-center">
            <StoreIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              You need an active subscription before your store goes live.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8 space-y-5">
      <PageHeader
        title="My Store"
        description="Your branded storefront — share it everywhere."
      />

      {/* Share card */}
      <Card>
        <CardContent className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
            Storefront URL
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[12px] bg-muted/50 rounded-lg px-3 py-2 truncate font-mono">
              {storeUrl}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={handleShareWhatsApp} className="text-xs">
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" asChild className="text-xs">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open store
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Identity */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">Store Identity</p>

          <div className="space-y-2">
            <Label className="text-xs">Logo</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <StoreIcon className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full pointer-events-none"
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="h-3.5 w-3.5 mr-1.5" /> Choose image</>
                  )}
                </Button>
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground/60">PNG, JPG or WEBP · max 2 MB.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-name" className="text-xs">Store name</Label>
            <Input
              id="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={60}
              className="text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline" className="text-xs">Tagline (optional)</Label>
            <Textarea
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={140}
              rows={2}
              placeholder="A short line shown on your storefront"
              className="text-base md:text-sm"
            />
            <p className="text-[10px] text-muted-foreground/60 text-right">{tagline.length}/140</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Slug</Label>
            <code className="block text-[12px] bg-muted/50 rounded-lg px-3 py-2 font-mono text-muted-foreground">
              /store/{profile.store_slug}
            </code>
            <p className="text-[10px] text-muted-foreground/60">
              Slugs are permanent. Contact support to change yours.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
