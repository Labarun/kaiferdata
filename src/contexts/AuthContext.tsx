/**
 * Kaiferdata Auth Context
 * Provides authentication state across the entire app.
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
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
  // Tracks whether the initial session resolution has already completed.
  // Prevents the onAuthStateChange SIGNED_IN handler from firing a redundant
  // second refreshUser() that creates a loading=false → user=null flash window.
  const initialResolved = useRef(false);

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
          // Skip the redundant refresh if the initial check already resolved.
          // This prevents a double-render that briefly sets user=null.
          if (!initialResolved.current) return;

          setTimeout(async () => {
            await refreshUser();
            // Audit login for admin/staff (only on actual new sign-ins, not restores)
            const u = await fetchCurrentUser();
            if (u && (u.role === "admin" || u.role === "staff")) {
              writeAuditLog({ action: `${u.role}_login` });
            }
          }, 0);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session) {
          // Token silently refreshed — re-fetch user profile to keep state fresh
          // without triggering a loading spinner.
          try {
            const currentUser = await fetchCurrentUser();
            setUser(currentUser);
          } catch {
            // Silently ignore — existing user state remains valid
          }
        }
      }
    );

    // THEN check existing session — this is the canonical first load
    refreshUser().then(() => {
      initialResolved.current = true;
    });

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
