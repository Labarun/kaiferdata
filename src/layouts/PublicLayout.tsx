/**
 * PublicLayout - Premium Ghana fintech layout with liquid-glass header
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

  // Close mobile menu on route change
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top notice strip */}
      <div className="relative z-40">
        <NoticeBanner audience="public" />
      </div>

      {/* Premium sticky glass header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass shadow-sm"
            : "bg-card/80 backdrop-blur-sm border-b border-border/50"
        }`}
      >
        <div className="container flex h-14 items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="text-sm font-extrabold text-primary-foreground">K</span>
            </div>
            <span className="text-[15px] font-extrabold text-foreground tracking-tight">
              Kaiferdata
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                  isActive(link.path)
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
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

          {/* Mobile: quick buy + menu */}
          <div className="flex md:hidden items-center gap-1.5">
            <Button size="sm" asChild className="h-8 px-3 rounded-lg text-xs font-bold shadow-sm">
              <Link to="/buy">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Buy
              </Link>
            </Button>
            <button
              className="p-2 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile slide menu */}
        {mobileOpen && (
          <div className="md:hidden glass border-t border-border/30 animate-fade-in">
            <div className="container py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive(link.path)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border/30 mt-3 space-y-2">
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

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating WhatsApp - refined pill */}
      <a
        href="https://wa.me/233000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 h-10 px-4 rounded-full bg-success text-success-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-xs font-semibold"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Support</span>
      </a>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-extrabold text-primary-foreground">K</span>
                </div>
                <span className="text-sm font-extrabold text-foreground">Kaiferdata</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ghana's premium data bundle platform. Fast, secure, and reliable.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Accra, Ghana</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-2.5 uppercase tracking-wider">Quick Links</p>
              <div className="space-y-1.5">
                <Link to="/buy" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Buy Data</Link>
                <Link to="/track" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Track Order</Link>
                <Link to="/login" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-2.5 uppercase tracking-wider">Support</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need help? Reach us on WhatsApp or email for instant support.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t text-center text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} Kaiferdata. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}