/**
 * ProtectedRoute - Route guard component
 * Checks auth, role, and account status before rendering children.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/services/auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Account suspended or disabled
  if (user.accountStatus === "suspended" || user.accountStatus === "disabled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Account {user.accountStatus}</h1>
          <p className="text-muted-foreground">
            {user.accountStatus === "suspended"
              ? "Your account has been temporarily suspended. Please contact support."
              : "Your account has been disabled. Please contact support for assistance."}
          </p>
        </div>
      </div>
    );
  }

  // Account pending
  if (user.accountStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Account Pending</h1>
          <p className="text-muted-foreground">
            Your account is pending approval. You'll be notified once it's activated.
          </p>
        </div>
      </div>
    );
  }

  // Role check
  if (!allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard instead of blocking
    const dashboardMap: Record<string, string> = {
      admin: "/admin",
      staff: "/staff",
      agent: "/agent",
      user: "/dashboard",
    };
    return <Navigate to={dashboardMap[user.role] || "/dashboard"} replace />;
  }

  return <>{children}</>;
}
