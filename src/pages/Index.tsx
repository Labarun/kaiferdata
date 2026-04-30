/**
 * Index page — public landing for guests, dashboard redirect for logged-in users.
 *
 * To eliminate the brief "flash" of the public landing page on refresh while
 * the auth check resolves, we synchronously detect whether a Supabase session
 * token exists in localStorage and immediately redirect logged-in users to
 * /dashboard before AuthContext finishes hydrating.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/public/LandingPage";

// Supabase persists its session in localStorage under `sb-<project-ref>-auth-token`.
// Detecting its presence synchronously lets us redirect logged-in users before
// the AuthContext finishes its async session check — no public-page flash.
function hasPersistedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        // Token exists — assume logged in. AuthContext will validate & sign out
        // if invalid; in that case the user lands on /dashboard which redirects
        // them back to /login via ProtectedRoute. No public-page flash either way.
        return true;
      }
    }
  } catch {
    // localStorage unavailable (private mode, SSR) — fall through.
  }
  return false;
}

export default function Index() {
  const { user, loading } = useAuth();

  // Fast path: persisted session detected → go straight to dashboard, no flash.
  if (loading && hasPersistedSession()) {
    return <Navigate to="/dashboard" replace />;
  }

  // Auth resolving and no session hint → show a neutral spinner instead of
  // flashing the public buy page.
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Logged-in users (any role) land on the user dashboard first.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Guests see the public landing page (replaces the direct buy page).
  return <LandingPage />;
}
