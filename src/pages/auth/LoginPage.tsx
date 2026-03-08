/**
 * Login Page — Sign in with username, phone, or email
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, getDashboardPath, fetchCurrentUser } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: err } = await signIn(identifier.trim(), password);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    await refreshUser();
    const user = await fetchCurrentUser();
    if (user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <LogIn className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-medium text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your Kaiferdata account</p>
        </div>

        <div className="glass-strong rounded-2xl p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-destructive/10 border border-destructive/15 text-destructive text-xs">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-xs text-foreground/80">Username, phone, or email</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                className="h-11 rounded-xl bg-accent/30 border-border/40"
                placeholder="kwame_asante or 0241234567"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-foreground/80">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl bg-accent/30 border-border/40"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-sm" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>

        <div className="mt-5 text-center space-y-2">
          <Link to="/forgot-password" className="text-xs text-primary hover:underline block">
            Forgot password?
          </Link>
          <p className="text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
