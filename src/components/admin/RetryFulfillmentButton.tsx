/**
 * RetryFulfillmentButton — Retry fulfillment for failed/stuck orders
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  orderId: string;
  orderStatus: string;
  onSuccess?: () => void;
}

export function RetryFulfillmentButton({ orderId, orderStatus, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const canRetry = ["paid", "queued", "failed"].includes(orderStatus);

  if (!canRetry) return null;

  const handleRetry = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Not authenticated", variant: "destructive" }); return; }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fulfill-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ order_id: orderId }),
        }
      );
      const data = await res.json();

      if (data.success) {
        toast({ title: "Fulfillment triggered", description: `Status: ${data.status}` });
        onSuccess?.();
      } else {
        toast({ title: "Fulfillment failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleRetry} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      {loading ? "Retrying…" : "Retry Fulfillment"}
    </Button>
  );
}
