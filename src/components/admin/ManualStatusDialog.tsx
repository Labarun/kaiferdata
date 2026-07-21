/**
 * ManualStatusDialog — Change status for a single order with note
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
import { Loader2 } from "lucide-react";
import { updateOrderStatus } from "@/services/supplierAdmin";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["paid", "queued", "processing", "on_hold", "delivered", "failed", "cancelled", "refunded"];

interface ManualStatusDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function ManualStatusDialog({ open, onOpenChange, orderId, currentStatus, onSuccess }: ManualStatusDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (status === currentStatus) {
      toast({ title: "No change", description: "Select a different status" });
      return;
    }
    setLoading(true);
    try {
      await updateOrderStatus(orderId, status, note || undefined);
      toast({ title: "Status Updated", description: `Order changed to ${status}` });
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Order Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
            <Label className="text-xs">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for manual status change"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || status === currentStatus}>
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
