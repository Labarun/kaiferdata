/**
 * Register Page - Premium aligned with public UI
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { signUp } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: err } = await signUp(email, password, fullName);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="container flex min-h-[70vh] items-center justify-center py-8">
        <Card className="w-full max-w-sm animate-fade-in">
          <CardContent className="p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
            </p>
            <Link to="/login" className="text-sm text-primary hover:underline inline-block mt-2">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
            <UserPlus className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Get started with Kaiferdata</p>
        </div>

        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs">{error}</div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Full name</Label>
                <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-10" maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-10" maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="h-10" />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
