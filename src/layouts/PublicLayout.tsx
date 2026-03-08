/**
 * PublicLayout - Liquid-glass themed layout
 */
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath } from "@/services/auth";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, MapPin, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Buy Data", path: "/buy" },
  { label: "Track Order", path: "/track" },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="relative z-40">
        <NoticeBanner audience="public" />
      </div>

      {/* Sticky glass header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass-strong"
            : "bg-background/60 backdrop-blur-sm border-b border-border/40"
        }`}
      >
        <div className="container flex h-14 items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center transition-all duration-200 group-hover:bg-primary/20">
              <span className="text-xs font-semibold text-primary">K</span>
            </div>
            <span className="text-sm font-medium text-foreground tracking-tight">
              Kaiferdata
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-all duration-200 ${
                  isActive(link.path)
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <Button asChild size="sm" className="h-8 text-xs">
                <Link to={getDashboardPath(user.role)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-muted-foreground">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild className="h-8 text-xs">
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-1.5">
            <Button size="sm" asChild className="h-8 px-3 text-xs">
              <Link to="/buy">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Buy
              </Link>
            </Button>
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden glass-strong border-t border-border/20 animate-fade-in">
            <div className="container py-3 space-y-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive(link.path)
                      ? "text-primary font-medium"
                      : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border/20 mt-3 space-y-2">
                {user ? (
                  <Button asChild className="w-full h-10">
                    <Link to={getDashboardPath(user.role)}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="w-full h-10" asChild>
                      <Link to="/login">Sign in</Link>
                    </Button>
                    <Button className="w-full h-10" asChild>
                      <Link to="/register">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Support pill */}
      <a
        href="https://wa.me/233000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 glass-subtle h-10 pl-3 pr-3.5 rounded-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
        aria-label="WhatsApp Support"
      >
        <MessageCircle className="h-4 w-4 text-success" />
        <span className="hidden sm:inline">Support</span>
      </a>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/80">
        <div className="container py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-5 w-5 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <span className="text-[9px] font-medium text-primary">K</span>
                </div>
                <span className="text-xs font-medium text-foreground">Kaiferdata</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ghana's premium data bundle platform.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Accra, Ghana</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-2.5 uppercase tracking-wider">Links</p>
              <div className="space-y-1.5">
                <Link to="/buy" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Buy Data</Link>
                <Link to="/track" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Track Order</Link>
                <Link to="/login" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-2.5 uppercase tracking-wider">Support</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reach us on WhatsApp for instant help.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/20 text-center text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} Kaiferdata. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
