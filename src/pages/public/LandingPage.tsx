/**
 * Homepage - Premium conversion-focused landing
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, Zap, Shield, Globe, Clock, Smartphone, Search,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-card border-b">
        <div className="container py-12 sm:py-20">
          <div className="max-w-xl mx-auto text-center sm:text-left sm:mx-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Zap className="h-3 w-3" />
              Instant data delivery
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
              Buy data & airtime instantly
            </h1>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
              No account needed. Select your network, choose a plan, and get instant delivery. Simple, fast, secure.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="text-sm h-11">
                <Link to="/buy">
                  Buy Data Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-sm h-11">
                <Link to="/track">
                  <Search className="mr-2 h-4 w-4" />
                  Track Your Order
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-12 sm:py-16">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">How it works</h2>
          <p className="text-sm text-muted-foreground mt-1">Three simple steps to get your data</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            {
              step: "1",
              icon: Smartphone,
              title: "Choose network & plan",
              desc: "Select from MTN, Airtel, Glo, or 9mobile and pick the data bundle that fits your needs.",
            },
            {
              step: "2",
              icon: Shield,
              title: "Enter phone & review",
              desc: "Provide the recipient phone number, review your order details, and confirm everything looks right.",
            },
            {
              step: "3",
              icon: Zap,
              title: "Pay & receive instantly",
              desc: "Complete payment securely and receive your data within seconds. Track anytime with your order reference.",
            },
          ].map((item) => (
            <Card key={item.step} className="relative overflow-hidden">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Step {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="bg-card border-y">
        <div className="container py-12 sm:py-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto text-center">
            {[
              { icon: Zap, label: "Instant Delivery", desc: "Seconds, not minutes" },
              { icon: Shield, label: "Secure Payment", desc: "End-to-end protection" },
              { icon: Globe, label: "All Networks", desc: "MTN, Airtel, Glo, 9mobile" },
              { icon: Clock, label: "24/7 Available", desc: "Anytime, anywhere" },
            ].map((item) => (
              <div key={item.label}>
                <div className="mx-auto h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="container py-12 sm:py-16">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 sm:p-8 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">
              Ready to get started?
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Buy data in seconds — no account required. Create an account for wallet features, order history, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-11">
                <Link to="/buy">Buy Data Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-11">
                <Link to="/register">Create Free Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
