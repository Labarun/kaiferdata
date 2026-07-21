/**
 * BulkRefundDialog — Trigger explicit wallet refund and status update for multiple selected orders
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Undo2 } from "lucide-react";
import { bulkRefundOrders } from "@/services/supplierAdmin";
import { useToast } from "@/hooks/use-toast";

interface BulkRefundDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderIds: string[];
  onSuccess: () => void;
}

export function BulkRefundDialog({ open, onOpenChange, orderIds, onSuccess }: BulkRefundDialogProps) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await bulkRefundOrders(orderIds, note || undefined);
      toast({
        title: "Bulk Refund Complete",
        description: `${result.updated} orders refunded${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Undo2 className="h-5 w-5" />
            Bulk Wallet Refund
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            You are about to refund <span className="font-bold text-foreground">{orderIds.length}</span> selected order(s).
            <br/><br/>
            This action will attempt to return funds to the customer's wallet and update the order status to <span className="font-semibold">Refunded</span>.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Note to Customer (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Refunded due to manual processing failure"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Refund {orderIds.length} Orders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
