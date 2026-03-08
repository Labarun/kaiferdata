/**
 * Kaiferdata Auth Context
 * Provides authentication state across the entire app.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCurrentUser, writeAuditLog, type AuthUser } from "@/services/auth";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Defer to avoid Supabase deadlock
          setTimeout(async () => {
            await refreshUser();
            // Audit login for admin/staff
            const u = await fetchCurrentUser();
            if (u && (u.role === "admin" || u.role === "staff")) {
              writeAuditLog({ action: `${u.role}_login` });
            }
          }, 0);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // THEN check existing session
    refreshUser();

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
