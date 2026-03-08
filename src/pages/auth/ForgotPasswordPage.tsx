/**
 * Forgot Password Page - Premium glass-inspired
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { resetPassword } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await resetPassword(email);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-7">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            {sent ? <CheckCircle2 className="h-5 w-5 text-success" /> : <KeyRound className="h-5 w-5 text-primary" />}
          </div>
          <h1 className="text-xl font-extrabold text-foreground">
            {sent ? "Check your email" : "Reset password"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sent ? "We've sent you a reset link" : "We'll send you a reset link"}
          </p>
        </div>

        <div className="glass rounded-2xl p-5 sm:p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Check your email for the password reset link.
              </p>
              <Link to="/login" className="text-sm text-primary hover:underline font-bold">
                Back to sign in
              </Link>
            </div>
          ) : (
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
              <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
              <Link to="/login" className="text-xs text-primary hover:underline font-semibold block text-center">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}