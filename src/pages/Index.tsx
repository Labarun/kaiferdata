/**
 * Index page — public landing for guests, dashboard redirect for logged-in users
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BuyDataPage from "@/pages/public/BuyDataPage";

export default function Index() {
  const { user, loading } = useAuth();

  // Don't flash the public page while we're checking the session
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Logged-in users (any role) land on the user dashboard first.
  // From there, admins/agents/staff can jump to their panels via the profile menu.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Guests see the public buy page (existing behavior preserved).
  return <BuyDataPage />;
}
