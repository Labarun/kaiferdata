/**
 * Login Page
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, getDashboardPath, fetchCurrentUser } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
            <div className="text-center space-y-2">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline block">
                Forgot password?
              </Link>
              <p className="text-xs text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline">Register</Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
