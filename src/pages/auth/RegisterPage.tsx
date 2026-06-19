/**
 * Register Page — Username, phone, email
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { signUp } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Trim inputs to avoid whitespace mismatches during login
    const trimmedUsername = username.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) { setError("Username can only contain letters, numbers, and underscores."); return; }
    if (trimmedPhone.length < 10) { setError("Enter a valid phone number."); return; }

    setLoading(true);
    const { error: err } = await signUp(trimmedEmail, password, trimmedUsername, trimmedPhone);
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
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center animate-fade-in-up">
          <div className="h-14 w-14 rounded-2xl bg-success/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
          </p>
          <Link to="/login" className="inline-block mt-5 text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-medium text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">Get started with Kaiferdata</p>
        </div>

        <div className="glass-strong rounded-2xl p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-destructive/10 border border-destructive/15 text-destructive text-xs">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs text-foreground/80">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="h-11 rounded-xl bg-accent/30 border-border/40"
                placeholder="e.g. kwame_asante"
                maxLength={30}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs text-foreground/80">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="h-11 rounded-xl bg-accent/30 border-border/40"
                placeholder="0241234567"
                maxLength={15}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-foreground/80">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl bg-accent/30 border-border/40"
                placeholder="you@email.com"
                maxLength={255}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-foreground/80">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 rounded-xl bg-accent/30 border-border/40 pr-10"
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-sm" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
