/**
 * PublicLayout - Premium public layout with conversion-focused navigation
 */
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath } from "@/services/auth";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, Search } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Buy Data", path: "/buy", primary: true },
  { label: "Track Order", path: "/track" },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Notice banner at very top */}
      <div className="bg-card border-b">
        <div className="container py-0">
          <NoticeBanner audience="public" />
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">K</span>
            </div>
            <span className="text-base font-bold text-foreground tracking-tight hidden sm:inline">
              Kaiferdata
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <Button asChild size="sm">
                <Link to={getDashboardPath(user.role)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Register</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile: Buy Data shortcut + menu */}
          <div className="flex md:hidden items-center gap-1">
            <Button variant="default" size="sm" asChild className="h-8 px-3">
              <Link to="/buy">
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Buy
              </Link>
            </Button>
            <button className="p-2 rounded-md hover:bg-muted" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-card animate-fade-in">
            <div className="container py-3 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive(link.path) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t mt-2 space-y-1.5">
                {user ? (
                  <Button asChild className="w-full" size="sm">
                    <Link to={getDashboardPath(user.role)} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" size="sm" asChild>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                    </Button>
                    <Button className="w-full" size="sm" asChild>
                      <Link to="/register" onClick={() => setMobileOpen(false)}>Register</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">K</span>
                </div>
                <span className="text-sm font-bold text-foreground">Kaiferdata</span>
              </div>
              <p className="text-xs text-muted-foreground">Fast, reliable data and airtime services.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Quick Links</p>
              <div className="space-y-1">
                <Link to="/buy" className="block text-xs text-muted-foreground hover:text-foreground">Buy Data</Link>
                <Link to="/track" className="block text-xs text-muted-foreground hover:text-foreground">Track Order</Link>
                <Link to="/login" className="block text-xs text-muted-foreground hover:text-foreground">Sign In</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Support</p>
              <p className="text-xs text-muted-foreground">Contact support coming soon.</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Kaiferdata. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
