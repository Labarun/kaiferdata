/**
 * PublicLayout - Layout for unauthenticated/public pages
 */
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath } from "@/services/auth";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function PublicLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground tracking-tight">
            Kaiferdata
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-2">
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
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </nav>

          {/* Mobile toggle */}
          <button className="sm:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="sm:hidden border-t p-4 space-y-2 bg-card">
            {user ? (
              <Button asChild className="w-full" size="sm">
                <Link to={getDashboardPath(user.role)} onClick={() => setMobileOpen(false)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" className="w-full" size="sm" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                </Button>
                <Button className="w-full" size="sm" asChild>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>Get started</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Notice area */}
      <div className="container mt-4">
        <NoticeBanner audience="public" />
      </div>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Kaiferdata. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
