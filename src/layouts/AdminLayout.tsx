/**
 * AdminLayout - Operations panel layout for admin/staff
 * Grouped, collapsible sidebar (desktop) + grouped drawer & bottom quick-dock (mobile).
 */
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/auth";
import kaiferLogo from "@/assets/kaiferdata-logo.png";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronDown, PanelLeftClose, PanelLeft, Search, X, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useCloseOnRouteChange } from "@/hooks/useCloseOnRouteChange";
import { AdminGlobalNotifications } from "@/components/admin/AdminGlobalNotifications";

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

interface AdminLayoutProps {
  navGroups: AdminNavGroup[];
  /** 4 key destinations for the mobile bottom dock; a "More" trigger is appended automatically. */
  quickDock?: AdminNavItem[];
  title: string;
  audienceFilter?: string;
}

const useIsActive = () => {
  const location = useLocation();
  return (path: string) =>
    location.pathname === path ||
    (path !== "/admin" && location.pathname.startsWith(path + "/"));
};

export function AdminLayout({ navGroups, quickDock = [], title, audienceFilter }: AdminLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = useIsActive();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="h-screen h-[100dvh] flex bg-background overflow-hidden">
      <AdminGlobalNotifications />

      {/* ── Desktop grouped sidebar ── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r bg-sidebar transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border/70 shrink-0">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2 group pl-1">
              <img src={kaiferLogo} alt="" className="h-7 w-7 object-contain shrink-0" />
              <span className="text-sm font-bold tracking-tight text-sidebar-primary-foreground">Kaiferdata</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-colors"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {navGroups.map((group, gi) => (
            <div key={group.label} className="space-y-0.5">
              {!collapsed ? (
                <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </p>
              ) : (
                gi > 0 && <div className="mx-2 my-1.5 border-t border-sidebar-border/50" />
              )}
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                    isActive(item.path)
                      ? "bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground font-semibold shadow-[0_4px_14px_-4px_hsl(213_73%_40%/0.55)]"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground"
                  } ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive(item.path) ? "scale-110" : ""} transition-transform`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <User className="h-4 w-4 text-sidebar-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.fullName}</p>
                <RoleBadge role={user?.role || "user"} />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 glass-topbar px-4">
          <button
            className="md:hidden p-1.5 -ml-1"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{title}</span>
          </div>

          <Button variant="ghost" size="sm" className="hidden sm:flex gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span className="text-xs">Search...</span>
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <User className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="mt-1"><RoleBadge role={user?.role || "user"} /></div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                <User className="mr-2 h-4 w-4" />
                Switch to User Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="container py-4 sm:py-6 pb-24 md:pb-8">
            <NoticeBanner audience={audienceFilter} />
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile floating glass dock ── */}
      {quickDock.length > 0 && (
        <nav
          className="md:hidden fixed left-3 right-3 z-40 glass-dock rounded-2xl"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <div className="flex items-stretch justify-around px-1 py-1.5">
            {quickDock.slice(0, 4).map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                    active ? "glass-nav-active text-primary" : "text-muted-foreground active:scale-95"
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                  <span className="truncate max-w-[60px]">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl text-[10px] font-medium text-muted-foreground active:scale-95"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      )}

      {/* ── Mobile grouped drawer ── */}
      <MobileMenu navGroups={navGroups} title={title} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

/** Mobile grouped slide-over menu, controlled by the parent. */
function MobileMenu({
  navGroups,
  title,
  open,
  onClose,
}: {
  navGroups: AdminNavGroup[];
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const isActive = useIsActive();
  useCloseOnRouteChange(() => onClose());

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px] md:hidden transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[9999] w-[86%] max-w-[320px] bg-sidebar border-r border-sidebar-border md:hidden
          flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border/70 shrink-0">
          <span className="flex items-center gap-2">
            <img src={kaiferLogo} alt="" className="h-6 w-6 object-contain" />
            <span className="text-sm font-bold text-sidebar-primary-foreground tracking-tight">{title}</span>
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-colors" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all active:opacity-70 ${
                    isActive(item.path)
                      ? "bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground font-semibold shadow-[0_4px_14px_-4px_hsl(213_73%_40%/0.55)]"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>,
    document.body,
  );
}
