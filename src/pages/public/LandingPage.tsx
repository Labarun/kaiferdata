/**
 * Homepage - Premium liquid-glass Ghana fintech landing
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Zap, Shield, Globe, Clock, Smartphone,
  Search, CheckCircle2, Signal, CreditCard, Headphones,
} from "lucide-react";

const NETWORKS = [
  { name: "MTN", accent: "border-network-mtn/30 hover:border-network-mtn/50", dot: "bg-network-mtn" },
  { name: "Telecel", accent: "border-network-telecel/30 hover:border-network-telecel/50", dot: "bg-network-telecel" },
  { name: "AirtelTigo", accent: "border-network-airteltigo/30 hover:border-network-airteltigo/50", dot: "bg-network-airteltigo" },
];

const TRUST_ITEMS = [
  { icon: Zap, label: "Instant Delivery" },
  { icon: Shield, label: "Secure" },
  { icon: Globe, label: "All Networks" },
  { icon: Clock, label: "24/7 Service" },
];

const STEPS = [
  { num: "01", icon: Smartphone, title: "Choose Bundle", desc: "Pick your network and data plan" },
  { num: "02", icon: CreditCard, title: "Enter & Pay", desc: "Add phone number and complete payment" },
  { num: "03", icon: Zap, title: "Receive Data", desc: "Data delivered to your phone in seconds" },
];

const FEATURES = [
  { icon: Signal, title: "All Ghana Networks", desc: "MTN, Telecel, and AirtelTigo in one place" },
  { icon: Shield, title: "No Account Needed", desc: "Buy instantly as a guest" },
  { icon: Headphones, title: "WhatsApp Support", desc: "Quick help anytime you need" },
  { icon: CheckCircle2, title: "Track Orders", desc: "Every purchase gets a trackable reference" },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ─── HERO ─── */}
      <section className="bg-hero-gradient relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[420px] h-[280px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[200px] h-[200px] rounded-full bg-primary/3 blur-[80px]" />
        </div>

        <div className="container relative py-14 sm:py-20 lg:py-24">
          <div className="max-w-lg mx-auto text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle text-[11px] text-muted-foreground mb-5 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              Service Online · Instant Delivery
            </div>

            <h1 className="text-[1.75rem] sm:text-3xl lg:text-4xl font-medium tracking-tight text-hero-foreground leading-[1.15] animate-fade-in-up">
              Buy Data Bundles{" "}
              <span className="text-gradient-gold">Instantly</span>{" "}
              in Ghana
            </h1>

            <p className="mt-4 text-sm text-hero-muted leading-relaxed max-w-sm mx-auto animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
              No account needed. Select your network, choose a plan, get data delivered in seconds.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up" style={{ animationDelay: "0.14s" }}>
              <Button asChild size="lg" className="h-11 px-7 text-sm">
                <Link to="/buy">
                  Buy Data Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="glass"
                size="lg"
                asChild
                className="h-11 px-7 text-sm text-muted-foreground hover:text-foreground"
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

      {/* ─── TRUST STRIP ─── */}
      <section className="border-b border-border/30 bg-card/40">
        <div className="container py-4">
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NETWORK QUICK ENTRY ─── */}
      <section className="container py-10 sm:py-14">
        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl font-medium text-foreground">Choose Your Network</h2>
          <p className="text-xs text-muted-foreground mt-1">Select a network to start buying</p>
        </div>
        <div className="flex gap-3 max-w-sm mx-auto">
          {NETWORKS.map((net) => (
            <Link
              key={net.name}
              to={`/buy?network=${net.name}`}
              className={`group flex-1 flex flex-col items-center gap-2 py-5 rounded-xl glass-subtle border ${net.accent} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
            >
              <span className={`h-3 w-3 rounded-full ${net.dot} shadow-sm`} />
              <span className="text-sm font-medium text-foreground">{net.name}</span>
              <span className="text-[10px] text-muted-foreground">Buy →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="border-y border-border/20">
        <div className="container py-10 sm:py-14">
          <div className="text-center mb-6">
            <h2 className="text-lg sm:text-xl font-medium text-foreground">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="glass-subtle p-4 rounded-xl animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-primary/70 tracking-widest">{step.num}</span>
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY KAIFERDATA ─── */}
      <section className="container py-10 sm:py-14">
        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl font-medium text-foreground">Why Kaiferdata</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="glass-subtle p-4 rounded-xl hover:bg-accent/30 transition-colors duration-200"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <feat.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-[13px] font-medium text-foreground mb-0.5">{feat.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="container pb-12 sm:pb-16">
        <div className="relative rounded-2xl overflow-hidden glass-strong p-7 sm:p-10 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-[-30%] right-[-5%] w-[200px] h-[200px] rounded-full bg-primary/6 blur-[70px]" />
          </div>
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-medium text-foreground mb-2">
              Ready to get your data?
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Buy data in seconds — no account required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-11 px-7 text-sm">
                <Link to="/buy">Buy Data Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button
                variant="glass"
                size="lg"
                asChild
                className="h-11 px-7 text-sm text-muted-foreground hover:text-foreground"
              >
                <Link to="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
