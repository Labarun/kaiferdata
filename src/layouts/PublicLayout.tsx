/**
 * PublicLayout — Premium light liquid-glass shell
 */
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import kaiferLogo from "@/assets/kaiferdata-logo.png";
import { getDashboardPath } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Menu, X, MapPin, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

export function PublicLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky glass header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled ? "glass-strong" : "bg-transparent"
        }`}
      >
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/8 border border-primary/15 flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_0_18px_-4px_hsl(38_82%_44%/0.25)]">
              <span className="text-xs font-bold text-primary">K</span>
            </div>
            <span className="text-[15px] font-semibold text-foreground/80 tracking-tight">
              Kaiferdata
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {[
              { label: "Buy Data", path: "/" },
              { label: "Track Order", path: "/track" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-1.5 rounded-xl text-[13px] transition-all duration-200 ${
                  location.pathname === link.path
                    ? "text-primary font-medium glass-subtle"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <Button asChild size="sm" className="h-9 text-xs">
                <Link to={getDashboardPath(user.role)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="h-9 text-xs text-muted-foreground">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild className="h-9 text-xs">
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex md:hidden items-center gap-1.5">
            {user && (
              <Button size="sm" asChild className="h-8 px-3 text-xs">
                <Link to={getDashboardPath(user.role)}>Dashboard</Link>
              </Button>
            )}
            <button
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden glass-strong border-t border-border/30 animate-fade-in">
            <div className="container py-3 space-y-0.5">
              {[
                { label: "Buy Data", path: "/" },
                { label: "Track Order", path: "/track" },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center px-3.5 py-3 rounded-xl text-sm transition-colors ${
                    location.pathname === link.path
                      ? "text-primary font-medium bg-primary/6"
                      : "text-foreground/55 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border/25 mt-3 space-y-2">
                {user ? (
                  <Button asChild className="w-full h-11">
                    <Link to={getDashboardPath(user.role)}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="glass" className="w-full h-11" asChild>
                      <Link to="/login">Sign in</Link>
                    </Button>
                    <Button className="w-full h-11" asChild>
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
        className="fixed bottom-5 right-5 z-40 glass-elevated h-10 w-10 sm:w-auto sm:px-4 rounded-full flex items-center justify-center sm:justify-start gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
        aria-label="WhatsApp Support"
      >
        <div className="h-5 w-5 rounded-full bg-success/12 flex items-center justify-center">
          <MessageCircle className="h-3 w-3 text-success" />
        </div>
        <span className="hidden sm:inline text-[11px] font-medium">Support</span>
      </a>

      {/* Footer */}
      <footer className="border-t border-border/35 bg-[hsl(228_20%_97%/0.6)] backdrop-blur-sm">
        <div className="container py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-lg bg-primary/12 border border-primary/10 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary">K</span>
                </div>
                <span className="text-xs font-semibold text-foreground/65">Kaiferdata</span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Ghana's premium data bundle platform.
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground/55">
                <MapPin className="h-3 w-3" />
                <span>Accra, Ghana</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/45 mb-3 uppercase tracking-[0.14em]">Links</p>
              <div className="space-y-2">
                <Link to="/" className="block text-[11px] text-muted-foreground/65 hover:text-foreground transition-colors">Buy Data</Link>
                <Link to="/track" className="block text-[11px] text-muted-foreground/65 hover:text-foreground transition-colors">Track Order</Link>
                <Link to="/login" className="block text-[11px] text-muted-foreground/65 hover:text-foreground transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/45 mb-3 uppercase tracking-[0.14em]">Support</p>
              <p className="text-[11px] text-muted-foreground/65 leading-relaxed">
                Reach us on WhatsApp for instant help with orders and bundles.
              </p>
            </div>
          </div>
          <div className="mt-7 pt-4 border-t border-border/25 text-center text-[10px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Kaiferdata. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
