/**
 * DashboardLayout — Premium liquid-glass customer dashboard shell
 */
import { Suspense, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import kaiferLogo from "@/assets/kaiferdata-logo.png";
import { signOut } from "@/services/auth";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { PageLoader } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/RoleBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronDown, UserCircle, Shield, Store, Headset, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useCloseOnRouteChange } from "@/hooks/useCloseOnRouteChange";
import { AnimatePresence, motion } from "framer-motion";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  featured?: boolean;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  desktopExtraNav?: NavItem[];
  title: string;
  audienceFilter?: string;
  /** Optional extra slot (e.g. "More" sheet trigger) shown at the end of the mobile dock. */
  mobileExtraDockSlot?: React.ReactNode;
}

export function DashboardLayout({ navItems, desktopExtraNav, title, audienceFilter, mobileExtraDockSlot }: DashboardLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  useCloseOnRouteChange(setMenuOpen);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  const allDesktopNav = [...navItems, ...(desktopExtraNav || [])];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Premium glass top bar ── */}
      <header className="sticky top-0 z-50 glass-topbar" style={{ paddingTop: "env(safe-area-inset-top)" }}>
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
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shadow-[0_0_8px_-3px_hsl(213_73%_40%/0.12)]">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user?.fullName?.split(" ")[0] || "Account"}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 glass-elevated rounded-xl border-border/30">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-1.5"><RoleBadge role={user?.role || "user"} /></div>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => { setMenuOpen(false); navigate("/dashboard"); }}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setMenuOpen(false); navigate("/dashboard/profile"); }}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>

                {(user?.role === "admin" || user?.role === "staff" || user?.role === "agent") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3">
                      Workspaces
                    </DropdownMenuLabel>

                    {user?.role === "admin" && (
                      <DropdownMenuItem onClick={() => { setMenuOpen(false); navigate("/admin"); }}>
                        <Shield className="mr-2 h-4 w-4 text-destructive" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}

                    {(user?.role === "admin" || user?.role === "staff") && (
                      <DropdownMenuItem onClick={() => { setMenuOpen(false); navigate("/staff"); }}>
                        <Headset className="mr-2 h-4 w-4 text-warning" />
                        Staff Panel
                      </DropdownMenuItem>
                    )}

                    {(user?.role === "admin" || user?.role === "agent") && (
                      <DropdownMenuItem onClick={() => { setMenuOpen(false); navigate("/agent"); }}>
                        <Store className="mr-2 h-4 w-4 text-primary" />
                        Agent Dashboard
                      </DropdownMenuItem>
                    )}
                  </>
                )}

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

        <main className="flex-1 min-w-0 pb-24 md:pb-6 overflow-x-clip">
          <div className="container py-5 sm:py-6 max-w-2xl min-w-0">
            <NoticeBanner audience={audienceFilter} />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Mobile floating glass dock ── */}
      <nav
        className="md:hidden fixed left-3 right-3 z-50 glass-dock rounded-2xl"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="flex items-end justify-around py-2 px-1">
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(item.path);
            const featured = !!item.featured;

            if (featured) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className="relative flex flex-col items-center -mt-5 px-2"
                >
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-[0_8px_22px_-6px_hsl(213_73%_40%/0.55),0_2px_6px_-1px_hsl(213_73%_40%/0.25)]"
                        : "bg-gradient-to-br from-primary/95 to-primary/75 text-primary-foreground shadow-[0_6px_18px_-6px_hsl(213_73%_40%/0.5)] active:scale-95"
                    } ring-2 ring-background/80`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`mt-1 text-[10px] font-semibold transition-colors ${active ? "text-primary" : "text-foreground/70"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                  active ? "glass-nav-active text-primary" : "text-muted-foreground active:scale-95"
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {mobileExtraDockSlot}
        </div>
      </nav>
    </div>
  );
}
