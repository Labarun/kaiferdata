/**
 * AgentMoreSheet — secondary agent menu (bottom sheet)
 * Houses items that don't fit the 4-tab bottom dock.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal, Store, Settings, CreditCard, UserCircle,
  LayoutDashboard, LogOut, Tag, Megaphone, Users, ListChecks, Layers,
} from "lucide-react";
import { signOut } from "@/services/auth";
import { useCloseOnRouteChange } from "@/hooks/useCloseOnRouteChange";

interface MoreItem {
  label: string;
  description?: string;
  icon: typeof Store;
  to?: string;
  external?: boolean;
  onClick?: () => void | Promise<void>;
  destructive?: boolean;
}

export function AgentMoreSheet({ storeSlug }: { storeSlug?: string | null }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useCloseOnRouteChange(setOpen);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const items: MoreItem[] = [
    { label: "Pricing", description: "Set selling prices", icon: Tag, to: "/agent/pricing" },
    { label: "Marketing", description: "QR, share, promote", icon: Megaphone, to: "/agent/marketing" },
    { label: "Customers", description: "Buyer insights", icon: Users, to: "/agent/customers" },
    { label: "Transactions", description: "Earnings ledger", icon: ListChecks, to: "/agent/transactions" },
    { label: "Bulk Orders", description: "Batch buy via wallet", icon: Layers, to: "/agent/bulk" },
    { label: "Manage Store", description: "Branding & details", icon: Settings, to: "/agent/store" },
    ...(storeSlug
      ? [{ label: "Open Storefront", description: `kaiferdata.com/store/${storeSlug}`, icon: Store, to: `/store/${storeSlug}`, external: true }]
      : []),
    { label: "Subscription", description: "Plan & renewal", icon: CreditCard, to: "/agent/subscription" },
    { label: "User Dashboard", description: "Switch to personal area", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Profile", description: "Account details", icon: UserCircle, to: "/dashboard/profile" },
    { label: "Sign out", icon: LogOut, onClick: handleSignOut, destructive: true },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="More"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium text-muted-foreground active:scale-95 transition-all"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Agent menu</SheetTitle>
        </SheetHeader>
        <div className="mt-3 grid gap-1.5">
          {items.map((it) => (
            <Button
              key={it.label}
              variant="ghost"
              className={`h-auto justify-start gap-3 py-3 px-3 rounded-xl ${
                it.destructive ? "text-destructive hover:text-destructive hover:bg-destructive/5" : ""
              }`}
              onClick={() => {
                setOpen(false);
                if (it.onClick) it.onClick();
                else if (it.to) {
                  if (it.external) window.open(it.to, "_blank");
                  else navigate(it.to);
                }
              }}
            >
              <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                <it.icon className={`h-4 w-4 ${it.destructive ? "text-destructive" : "text-primary"}`} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-sm font-medium leading-tight">{it.label}</div>
                {it.description && (
                  <div className="text-[11px] text-muted-foreground truncate">{it.description}</div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
