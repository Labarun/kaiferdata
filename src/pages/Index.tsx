import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/public/LandingPage";

export default function Index() {
  const { user, loading } = useAuth();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    // If auth finishes loading and there's no user, delay showing the landing page
    // slightly. In production, Supabase sometimes fires onAuthStateChange late,
    // which causes a brief flash of the landing page before redirecting to dashboard.
    if (!loading && !user) {
      const timer = setTimeout(() => setShowLanding(true), 350);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  // Logged-in users (any role) land on the user dashboard first.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Auth resolving or waiting for debounce → show a neutral spinner instead of
  // flashing the public buy page.
  if (loading || !showLanding) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Guests see the public landing page after the delay confirms no session.
  return <LandingPage />;
}
