/**
 * Agent Marketing — /agent/marketing
 * QR code, copyable promo messages, social share helpers.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Share2, ExternalLink, Download, MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeCanvas } from "qrcode.react";
import { SubscriptionGate } from "@/components/agent/SubscriptionGate";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AgentMarketingPage caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-lg mx-auto my-8 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl space-y-3">
          <h2 className="text-base font-bold">Marketing Page Load Failure</h2>
          <p className="text-xs font-mono bg-background/50 p-3 rounded border overflow-auto max-h-60 whitespace-pre-wrap">
            {this.state.error?.stack || this.state.error?.toString()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Please copy this error message and share it with the administrator.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AgentMarketingPage() {
  console.log("Rendering AgentMarketingPage, QRCodeCanvas type:", typeof QRCodeCanvas);
  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader title="Marketing" description="Promote your store and grow your customer base." />
      <ErrorBoundary>
        <SubscriptionGate message="Subscribe to unlock marketing tools.">
          <MarketingInner />
        </SubscriptionGate>
      </ErrorBoundary>
    </div>
  );
}

function MarketingInner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  console.log("MarketingInner state: user.id =", user?.id, "loading =", loading, "storeSlug =", storeSlug);

  useEffect(() => {
    if (!user?.id) {
      console.log("MarketingInner useEffect: no user.id, skipping fetch");
      return;
    }
    let cancelled = false;
    console.log("MarketingInner useEffect: fetching agent profile for", user.id);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("agent_profiles")
          .select("store_slug, store_name")
          .eq("user_id", user.id)
          .maybeSingle();
        console.log("MarketingInner fetched profile:", data, "error:", error);
        if (cancelled) return;
        setStoreSlug(data?.store_slug ?? null);
        setStoreName(data?.store_name ?? "");
        setLoading(false);
      } catch (err) {
        console.error("MarketingInner fetch exception:", err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const storeUrl = storeSlug ? `${window.location.origin}/store/${storeSlug}` : "";

  const messages = storeUrl
    ? [
        {
          key: "short",
          label: "Quick share",
          text: `Buy data fast at ${storeName} 🚀\n${storeUrl}`,
        },
        {
          key: "long",
          label: "Full pitch",
          text: `🔥 Get instant data bundles from ${storeName}!\n\n✅ MTN, Telecel & AirtelTigo\n✅ Instant delivery\n✅ Best prices\n✅ Secure payment\n\nShop now → ${storeUrl}`,
        },
        {
          key: "promo",
          label: "Promotional",
          text: `Need data right now? ${storeName} has you covered ⚡\n\nFast, secure, reliable.\n\n${storeUrl}`,
        },
      ]
    : [];

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById("agent-qr") as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storeSlug}-qr.png`;
    a.click();
  };

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;
  }

  if (!storeSlug) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active store yet.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Storefront link */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70">Storefront URL</p>
          <code className="block text-[12px] bg-muted/50 rounded-lg px-3 py-2 truncate font-mono">{storeUrl}</code>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" onClick={() => handleCopy("url", storeUrl)} className="text-xs">
              {copiedKey === "url" ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Buy data fast at ${storeName}! ${storeUrl}`)}`, "_blank")}
              className="text-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" asChild className="text-xs">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Visit
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70">QR Code</p>
          <div className="bg-white rounded-2xl p-5 flex justify-center">
            <QRCodeCanvas
              id="agent-qr"
              value={storeUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleDownloadQR} className="w-full">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download QR
          </Button>
          <p className="text-[10px] text-muted-foreground/60 text-center">
            Print on flyers, business cards, or share digitally.
          </p>
        </CardContent>
      </Card>

      {/* Pre-written messages */}
      <div className="space-y-3">
        <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70 px-1">Ready-to-share copy</p>
        {messages.map((m) => (
          <Card key={m.key}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{m.label}</p>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(m.key, m.text)} className="h-7 text-xs">
                  {copiedKey === m.key ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>
              </div>
              <Textarea
                readOnly
                value={m.text}
                rows={Math.min(8, m.text.split("\n").length + 1)}
                className="text-xs font-mono bg-muted/30 resize-none"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(m.text)}`, "_blank")}
                className="w-full text-xs"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Share on WhatsApp
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
