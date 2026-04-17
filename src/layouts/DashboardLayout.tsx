/**
 * DashboardLayout — Premium liquid-glass customer dashboard shell
 */
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import kaiferLogo from "@/assets/kaiferdata-logo.png";
import { signOut } from "@/services/auth";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/RoleBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronDown, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  desktopExtraNav?: NavItem[];
  title: string;
  audienceFilter?: string;
}

export function DashboardLayout({ navItems, desktopExtraNav, title, audienceFilter }: DashboardLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  const allDesktopNav = [...navItems, ...(desktopExtraNav || [])];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Premium glass top bar ── */}
      <header className="sticky top-0 z-50 glass-topbar">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2 group">
              <img src={kaiferLogo} alt="Kaiferdata logo" className="h-8 w-8 object-contain shrink-0" />
              <span className="text-lg font-bold tracking-tight">
                <span className="text-gradient-brand">Kaifer</span>
                <span className="text-foreground">data</span>
              </span>
            </Link>
            <span className="hidden sm:inline text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shadow-[0_0_8px_-3px_hsl(213_73%_40%/0.12)]">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user?.fullName?.split(" ")[0] || "Account"}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-elevated rounded-xl border-border/30">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="mt-1.5"><RoleBadge role={user?.role || "user"} /></div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Desktop sidebar + content ── */}
      <div className="flex-1 flex">
        <aside className="hidden md:flex w-60 shrink-0 flex-col p-4 space-y-1 glass-subtle border-r-0">
          <div className="space-y-0.5 mt-2">
            {allDesktopNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive(item.path)
                    ? "glass-nav-active text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                }`}
              >
                <item.icon className={`h-[18px] w-[18px] ${isActive(item.path) ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            ))}
          </div>
        </aside>

        <main className="flex-1 pb-24 md:pb-6">
          <div className="container py-5 sm:py-6 max-w-2xl">
            <NoticeBanner audience={audienceFilter} />
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile floating glass dock ── */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 glass-dock rounded-2xl">
        <div className="flex items-center justify-around py-2 px-1">
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                  active
                    ? "glass-nav-active text-primary"
                    : "text-muted-foreground active:scale-95"
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
