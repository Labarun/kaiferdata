/**
 * Login Page - Premium aligned with public UI
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, getDashboardPath, fetchCurrentUser } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="container flex min-h-[70vh] items-center justify-center py-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
            <LogIn className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sign in to your account</p>
        </div>

        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs">{error}</div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-10" />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center space-y-1.5">
          <Link to="/forgot-password" className="text-xs text-primary hover:underline block">
            Forgot password?
          </Link>
          <p className="text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
