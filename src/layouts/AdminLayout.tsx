/**
 * AdminLayout - Operations panel layout for admin/staff
 * Serious sidebar with collapsible navigation.
 */
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/auth";
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
import { User, LogOut, ChevronDown, PanelLeftClose, PanelLeft, Search, Bell } from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface AdminLayoutProps {
  navItems: AdminNavItem[];
  title: string;
  audienceFilter?: string;
}

export function AdminLayout({ navItems, title, audienceFilter }: AdminLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r bg-sidebar transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <Link to="/" className="text-sm font-bold text-sidebar-primary-foreground tracking-tight">
              Kaiferdata
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(item.path)
                  ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border">
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

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4">
          {/* Mobile sidebar trigger */}
          <MobileSidebar navItems={navItems} title={title} />

          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>

          {/* Search placeholder */}
          <Button variant="ghost" size="sm" className="hidden sm:flex gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span className="text-xs">Search...</span>
          </Button>

          {/* Notifications placeholder */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Profile */}
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
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container py-4 sm:py-6">
            <NoticeBanner audience={audienceFilter} />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Mobile sidebar as a slide-over */
function MobileSidebar({ navItems, title }: { navItems: AdminNavItem[]; title: string }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <button className="md:hidden p-1.5" onClick={() => setOpen(true)}>
        <PanelLeft className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border md:hidden">
            <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
              <span className="text-sm font-bold text-sidebar-primary-foreground">{title}</span>
              <button onClick={() => setOpen(false)} className="p-1.5 text-sidebar-foreground">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <nav className="p-2 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
