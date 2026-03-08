/**
 * Homepage - Premium Ghana fintech landing with liquid-glass accents
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Zap, Shield, Globe, Clock, Smartphone,
  Search, CheckCircle2, Signal, CreditCard, Headphones,
} from "lucide-react";

const NETWORKS = [
  { name: "MTN", accent: "bg-network-mtn/15 border-network-mtn/30 text-network-mtn", dot: "bg-network-mtn" },
  { name: "Telecel", accent: "bg-network-telecel/15 border-network-telecel/30 text-network-telecel", dot: "bg-network-telecel" },
  { name: "AirtelTigo", accent: "bg-network-airteltigo/15 border-network-airteltigo/30 text-network-airteltigo", dot: "bg-network-airteltigo" },
];

const TRUST_ITEMS = [
  { icon: Zap, label: "Instant Delivery", desc: "Data in seconds" },
  { icon: Shield, label: "Secure Payments", desc: "Encrypted & safe" },
  { icon: Globe, label: "All Networks", desc: "MTN, Telecel, AT" },
  { icon: Clock, label: "24/7 Service", desc: "Always available" },
];

const STEPS = [
  { num: "01", icon: Smartphone, title: "Choose Bundle", desc: "Pick your network and the data plan that fits." },
  { num: "02", icon: CreditCard, title: "Enter & Pay", desc: "Add the phone number and pay securely." },
  { num: "03", icon: Zap, title: "Receive Data", desc: "Data delivered to the number within seconds." },
];

const FEATURES = [
  { icon: Signal, title: "All Ghana Networks", desc: "MTN, Telecel, and AirtelTigo bundles in one place." },
  { icon: Shield, title: "No Account Required", desc: "Buy instantly as a guest. Create an account for more features." },
  { icon: Headphones, title: "WhatsApp Support", desc: "Quick help from our support team anytime you need it." },
  { icon: CheckCircle2, title: "Track Your Order", desc: "Every purchase gets a reference you can track anytime." },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="bg-hero-gradient relative">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-30%] left-[50%] translate-x-[-50%] w-[600px] h-[400px] rounded-full bg-primary/8 blur-[100px]" />
        </div>

        <div className="container relative py-14 sm:py-20 lg:py-24">
          <div className="max-w-xl mx-auto text-center">
            {/* Status pill - glass */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle text-[11px] font-semibold tracking-wide text-hero-foreground/80 mb-5 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              Service Online — Instant Delivery
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-hero-foreground leading-[1.1] animate-fade-in-up">
              Buy Data Bundles{" "}
              <span className="text-gradient-gold">Instantly</span>{" "}
              in Ghana
            </h1>

            <p className="mt-4 text-sm sm:text-base text-hero-muted leading-relaxed max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              No account needed. Select your network, choose a plan, and get data delivered in seconds. Fast, secure, and trusted.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Button asChild size="lg" className="h-12 px-7 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200">
                <Link to="/buy">
                  Buy Data Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 px-7 rounded-xl text-sm font-bold border-hero-foreground/15 text-hero-foreground/80 hover:text-hero-foreground hover:bg-hero-foreground/5 bg-transparent"
              >
                <Link to="/track">
                  <Search className="mr-2 h-4 w-4" />
                  Track Order
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="border-b bg-card">
        <div className="container py-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground leading-tight">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NETWORK QUICK ENTRY ============ */}
      <section className="container py-10 sm:py-14">
        <div className="text-center mb-7">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Choose Your Network</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a network to start buying data instantly</p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          {NETWORKS.map((net) => (
            <Link
              key={net.name}
              to={`/buy?network=${net.name}`}
              className={`group relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${net.accent}`}
            >
              <div className={`h-3 w-3 rounded-full ${net.dot} shadow-sm`} />
              <span className="text-sm font-extrabold">{net.name}</span>
              <span className="text-[10px] font-medium opacity-70">Buy Now →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="bg-card border-y">
        <div className="container py-10 sm:py-14">
          <div className="text-center mb-7">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-1">Three simple steps to get your data</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="relative p-5 rounded-xl bg-background border border-border/60 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-extrabold text-primary tracking-wider">{step.num}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY KAIFERDATA ============ */}
      <section className="container py-10 sm:py-14">
        <div className="text-center mb-7">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Why Kaiferdata</h2>
          <p className="text-sm text-muted-foreground mt-1">Built for Ghana, designed for speed</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="p-4 rounded-xl border border-border/60 bg-card hover:shadow-sm transition-shadow duration-200"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5">
                <feat.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-[13px] font-bold text-foreground mb-0.5">{feat.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="container pb-12 sm:pb-16">
        <div className="relative rounded-2xl overflow-hidden bg-hero-gradient p-7 sm:p-10 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-[-40%] right-[-10%] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[80px]" />
          </div>
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-extrabold text-hero-foreground mb-2">
              Ready to get your data?
            </h2>
            <p className="text-sm text-hero-muted mb-5 max-w-sm mx-auto">
              Buy data in seconds — no account required. Or create an account for wallet features and order history.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-11 px-6 rounded-xl text-sm font-bold shadow-lg">
                <Link to="/buy">Buy Data Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 px-6 rounded-xl text-sm font-bold border-hero-foreground/15 text-hero-foreground/80 hover:text-hero-foreground hover:bg-hero-foreground/5 bg-transparent"
              >
                <Link to="/register">Create Free Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}