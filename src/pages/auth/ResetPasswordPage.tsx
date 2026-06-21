/**
 * Reset Password Page - handles the reset link callback
 *
 * Supports both legacy (hash-based) and PKCE (code-based) recovery flows:
 *  - Legacy: URL contains #type=recovery → fires PASSWORD_RECOVERY event
 *  - PKCE:   URL contains ?code=xxx → Supabase exchanges code for session,
 *            fires SIGNED_IN event instead of PASSWORD_RECOVERY
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { updatePassword } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  // Brief check phase so we don't flash "invalid" before the auth listener fires
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;
    const settle = () => { if (!settled) { settled = true; setChecking(false); } };

    // 1. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsRecovery(true);
        settle();
      }
    });

    // 2. Check URL indicators (hash for legacy, query param for PKCE)
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.has("code");

    if (hash.includes("type=recovery") || hasCode) {
      // Mark as recovery optimistically — the auth listener will also fire
      setIsRecovery(true);
      settle();
    }

    // 3. Fallback: check if there's already an active session
    //    (in case the auth event already fired before this component mounted)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && (hasCode || hash.includes("type=recovery"))) {
        setIsRecovery(true);
      }
      settle();
    });

    // Safety timeout — stop checking after 3 seconds regardless
    const timeout = setTimeout(settle, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await updatePassword(password);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  // Show spinner while we're still verifying recovery status
  if (checking) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isRecovery && !success) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Invalid or expired reset link.</p>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline mt-2 block">Request a new one</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Set new password</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-success">Password updated! Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
