/**
 * PublicLayout - Premium Ghana fintech layout with glass header and refined support pill
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
            ? "glass shadow-sm"
            : "bg-card/80 backdrop-blur-sm border-b border-border/50"
        }`}
      >
        <div className="container flex h-13 items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="text-xs font-extrabold text-primary-foreground">K</span>
            </div>
            <span className="text-sm font-extrabold text-foreground tracking-tight">
              Kaiferdata
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {user ? (
              <Button asChild size="sm" className="h-8 rounded-lg text-xs font-semibold">
                <Link to={getDashboardPath(user.role)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="h-8 rounded-lg text-xs font-semibold">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild className="h-8 rounded-lg text-xs font-semibold shadow-sm">
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-1">
            <Button size="sm" asChild className="h-8 px-3 rounded-lg text-xs font-bold shadow-sm">
              <Link to="/buy">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Buy
              </Link>
            </Button>
            <button
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden glass border-t border-border/30 animate-fade-in">
            <div className="container py-3 space-y-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive(link.path)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2.5 border-t border-border/30 mt-2.5 space-y-1.5">
                {user ? (
                  <Button asChild className="w-full h-10 rounded-lg font-semibold">
                    <Link to={getDashboardPath(user.role)}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="w-full h-10 rounded-lg font-semibold" asChild>
                      <Link to="/login">Sign in</Link>
                    </Button>
                    <Button className="w-full h-10 rounded-lg font-semibold" asChild>
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

      {/* Refined support pill — bottom-right, minimal */}
      <a
        href="https://wa.me/233000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full bg-success/90 text-success-foreground shadow-md hover:shadow-lg hover:bg-success transition-all duration-200 flex items-center justify-center active:scale-95"
        aria-label="WhatsApp Support"
      >
        <MessageCircle className="h-4.5 w-4.5" />
      </a>

      {/* Footer */}
      <footer className="border-t bg-card/80">
        <div className="container py-7">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-[9px] font-extrabold text-primary-foreground">K</span>
                </div>
                <span className="text-xs font-extrabold text-foreground">Kaiferdata</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ghana's premium data bundle platform.
              </p>
              <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Accra, Ghana</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-foreground mb-2 uppercase tracking-wider">Links</p>
              <div className="space-y-1">
                <Link to="/buy" className="block text-[11px] text-muted-foreground hover:text-foreground transition-colors">Buy Data</Link>
                <Link to="/track" className="block text-[11px] text-muted-foreground hover:text-foreground transition-colors">Track Order</Link>
                <Link to="/login" className="block text-[11px] text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-foreground mb-2 uppercase tracking-wider">Support</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Reach us on WhatsApp for instant help.
              </p>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t text-center text-[10px] text-muted-foreground">
            &copy; {new Date().getFullYear()} Kaiferdata. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
