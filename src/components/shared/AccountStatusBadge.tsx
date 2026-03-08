/**
 * AccountStatusBadge - Displays account status
 */
import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/services/auth";

const statusStyles: Record<AccountStatus, string> = {
  active: "bg-success/10 text-success border-success/20",
  suspended: "bg-warning/10 text-warning border-warning/20",
  pending: "bg-primary/10 text-primary border-primary/20",
  disabled: "bg-destructive/10 text-destructive border-destructive/20",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge variant="outline" className={`text-xs capitalize ${statusStyles[status]}`}>
      {status}
    </Badge>
  );
}
