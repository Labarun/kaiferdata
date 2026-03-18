/**
 * BulkStatusDialog — Update status for multiple selected orders
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { bulkUpdateOrderStatus } from "@/services/supplierAdmin";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["paid", "queued", "processing", "delivered", "failed", "cancelled", "refunded"];

interface BulkStatusDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderIds: string[];
  onSuccess: () => void;
}

export function BulkStatusDialog({ open, onOpenChange, orderIds, onSuccess }: BulkStatusDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState("delivered");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await bulkUpdateOrderStatus(orderIds, status, note || undefined);
      toast({
        title: "Bulk Update Complete",
        description: `${result.updated} orders updated${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}`,
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Bulk Status Update
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Update <span className="font-bold text-foreground">{orderIds.length}</span> selected orders to a new status.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note / Reason (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Confirmed delivery via supplier portal"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Update {orderIds.length} Orders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
