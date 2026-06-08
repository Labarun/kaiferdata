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
  LayoutDashboard, LogOut, Tag, Megaphone, Users, ListChecks, ArrowDownToLine,
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
    { label: "Marketing", description: "QR, share, promote", icon: Megaphone, to: "/agent/marketing" },
    { label: "Withdraw", description: "Cash out to MoMo", icon: ArrowDownToLine, to: "/agent/withdraw" },
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
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 gap-y-6 gap-x-2">
          {items.map((it) => (
            <button
              key={it.label}
              className={`flex flex-col items-center justify-start gap-2.5 rounded-xl transition-all active:scale-95 ${it.destructive ? "text-destructive hover:opacity-80" : "text-foreground hover:opacity-80"
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
              <div className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${it.destructive ? 'bg-destructive/5 border-destructive/10' : 'bg-background border-border/40'
                }`}>
                <it.icon className={`h-6 w-6 ${it.destructive ? "text-destructive/80" : "text-primary/70"}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight px-1 max-w-full truncate text-muted-foreground">
                {it.label}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
