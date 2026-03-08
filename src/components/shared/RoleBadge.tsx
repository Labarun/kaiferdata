/**
 * RoleBadge - Displays a user's role as a styled badge
 */
import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/services/auth";

const roleStyles: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  staff: "bg-warning/10 text-warning border-warning/20",
  agent: "bg-primary/10 text-primary border-primary/20",
  user: "bg-muted text-muted-foreground border-border",
};

export function RoleBadge({ role }: { role: AppRole }) {
  return (
    <Badge variant="outline" className={`text-xs capitalize ${roleStyles[role]}`}>
      {role}
    </Badge>
  );
}
