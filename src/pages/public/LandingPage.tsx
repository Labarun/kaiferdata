/**
 * Public Landing Page
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="container">
      {/* Hero */}
      <section className="py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
          Your data services, simplified
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
          Fast, reliable, and secure platform for all your data and airtime transactions.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/register">Get started <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="pb-16 sm:pb-24">
        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: Zap, title: "Instant delivery", desc: "Transactions processed in seconds with real-time confirmations." },
            { icon: Shield, title: "Secure platform", desc: "Enterprise-grade security for every transaction and account." },
            { icon: Globe, title: "Wide coverage", desc: "Access data and airtime services across multiple networks." },
          ].map((f) => (
            <div key={f.title} className="text-center p-6 rounded-lg border bg-card">
              <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
