/**
 * PublicLayout — Premium floating liquid-glass shell
 */
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import kaiferLogo from "@/assets/kaiferdata-logo.png";
import { getDashboardPath } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Menu, X, MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";


export function PublicLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(false);
  const location = useLocation();


  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Handle automatic WhatsApp tooltip popup
  useEffect(() => {
    const showTimer = setTimeout(() => setShowWhatsAppTooltip(true), 3000);
    const hideTimer = setTimeout(() => setShowWhatsAppTooltip(false), 18000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Floating glass header */}
      <header
        className={`sticky top-0 z-50 transition-[background,backdrop-filter,border-color,box-shadow] duration-500 will-change-[backdrop-filter] ${
          scrolled ? "glass-strong" : "bg-transparent"
        }`}
      >
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <img
              src={kaiferLogo}
              alt="Kaiferdata logo"
              className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-[15px] font-bold text-foreground/85 tracking-tight">
              <span className="text-gradient-brand">Kaifer</span>
              <span>data</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {[
              { label: "Home", path: "/" },
              { label: "Buy Data", path: "/buy" },
              { label: "Track Order", path: "/track" },
              { label: "Blog", path: "/blog" },
              { label: "About", path: "/about" },
              { label: "Kaifer Agents", path: "/agent-perks" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-1.5 rounded-xl text-[13px] transition-all duration-200 ${
                  location.pathname === link.path
                    ? "text-primary font-medium glass-subtle"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <ThemeToggle />
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
            <ThemeToggle />
            {user && (
              <Button size="sm" asChild className="h-8 px-3 text-xs">
                <Link to={getDashboardPath(user.role)}>Dashboard</Link>
              </Button>
            )}
            <button
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all"
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
                { label: "Home", path: "/" },
                { label: "Buy Data", path: "/buy" },
                { label: "Track Order", path: "/track" },
                { label: "Blog", path: "/blog" },
                { label: "About", path: "/about" },
                { label: "Kaifer Agents", path: "/agent-perks" },
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

      <main
        className="flex-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Outlet />
      </main>

      {/* WhatsApp Channel FAB */}
      <Tooltip open={showWhatsAppTooltip} onOpenChange={setShowWhatsAppTooltip}>
        <TooltipTrigger asChild>
          <a
            href="https://whatsapp.com/channel/0029VbCn7xiKbYMWspFUrd2r"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-5 right-5 z-40 group"
            aria-label="Join our WhatsApp Channel"
          >
            {/* Ping ring */}
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 group-hover:opacity-30" />
            {/* Outer glow */}
            <span className="absolute -inset-1 rounded-full bg-[#25D366]/20 blur-md group-hover:bg-[#25D366]/30 transition-all duration-300" />
            {/* Button */}
            <span className="relative flex items-center justify-center h-12 w-12 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:shadow-[#25D366]/35 hover:scale-105 active:scale-95 transition-all duration-200">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </span>
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>Join our WhatsApp Channel for updates!</p>
        </TooltipContent>
      </Tooltip>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-black/5 dark:bg-black/20 backdrop-blur-sm py-10 mt-auto">
        <div className="container">
          {/* Link Groups */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            {/* Products */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Products</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/buy" className="text-muted-foreground hover:text-foreground transition-colors">Buy Data</Link></li>
                <li><Link to="/track" className="text-muted-foreground hover:text-foreground transition-colors">Track Order</Link></li>
                <li><Link to="/get-app" className="text-muted-foreground hover:text-foreground transition-colors">Download App</Link></li>
              </ul>
            </div>
            {/* Company */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Company</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
                <li><Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog Spot</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact & Support</Link></li>
                <li><Link to="/agent-perks" className="text-primary/90 hover:text-primary transition-colors font-semibold">Kaifer Agents</Link></li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            {/* Connect */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Connect</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://wa.me/233204471969"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-[#25D366] transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp Support
                  </a>
                </li>
                <li>
                  <a
                    href="https://whatsapp.com/channel/0029VbCn7xiKbYMWspFUrd2r"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-[#25D366] transition-colors"
                  >
                    WhatsApp Channel
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground/50">
              © {new Date().getFullYear()} Kaiferdata. All rights reserved.
            </p>
            <p className="text-[10px] text-muted-foreground/40 tracking-wide">
              Developed by{" "}
              <a
                href="https://www.kaifertech.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/55 hover:text-primary transition-colors duration-200"
              >
                Kaifer Tech
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
