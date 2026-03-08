/**
 * Login Page - Premium glass-inspired auth
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: err } = await signIn(email, password);
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
        {/* Header */}
        <div className="text-center mb-7">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <LogIn className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sign in to your Kaiferdata account</p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2.5 rounded-xl bg-destructive/8 border border-destructive/15 text-destructive text-xs font-medium">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl"
                placeholder="you@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-sm" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>

        <div className="mt-5 text-center space-y-2">
          <Link to="/forgot-password" className="text-xs text-primary hover:underline font-semibold block">
            Forgot password?
          </Link>
          <p className="text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-bold">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}