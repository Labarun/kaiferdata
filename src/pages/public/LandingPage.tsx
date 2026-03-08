/**
 * Homepage - Premium Ghana fintech landing
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Zap, Shield, Globe, Clock, Smartphone,
  Search, CheckCircle2, Signal, CreditCard, Headphones,
} from "lucide-react";

const NETWORKS = [
  { name: "MTN", dot: "bg-network-mtn", ring: "ring-network-mtn/20", bg: "bg-network-mtn/10 border-network-mtn/30" },
  { name: "Telecel", dot: "bg-network-telecel", ring: "ring-network-telecel/20", bg: "bg-network-telecel/10 border-network-telecel/30" },
  { name: "AirtelTigo", dot: "bg-network-airteltigo", ring: "ring-network-airteltigo/20", bg: "bg-network-airteltigo/10 border-network-airteltigo/30" },
];

const TRUST_ITEMS = [
  { icon: Zap, label: "Instant Delivery" },
  { icon: Shield, label: "Secure" },
  { icon: Globe, label: "All Networks" },
  { icon: Clock, label: "24/7" },
];

const STEPS = [
  { num: "01", icon: Smartphone, title: "Choose Bundle", desc: "Pick network and data plan." },
  { num: "02", icon: CreditCard, title: "Enter & Pay", desc: "Add phone number and pay." },
  { num: "03", icon: Zap, title: "Receive Data", desc: "Data delivered in seconds." },
];

const FEATURES = [
  { icon: Signal, title: "All Ghana Networks", desc: "MTN, Telecel, and AirtelTigo in one place." },
  { icon: Shield, title: "No Account Needed", desc: "Buy instantly as a guest." },
  { icon: Headphones, title: "WhatsApp Support", desc: "Quick help anytime you need." },
  { icon: CheckCircle2, title: "Track Orders", desc: "Every purchase gets a trackable reference." },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ─── HERO ─── */}
      <section className="bg-hero-gradient relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[500px] h-[350px] rounded-full bg-primary/6 blur-[100px]" />
        </div>

        <div className="container relative py-12 sm:py-16 lg:py-20">
          <div className="max-w-xl mx-auto text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle text-[10px] font-semibold tracking-wide text-hero-foreground/70 mb-4 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              Service Online · Instant Delivery
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-hero-foreground leading-[1.12] animate-fade-in-up">
              Buy Data Bundles{" "}
              <span className="text-gradient-gold">Instantly</span>{" "}
              in Ghana
            </h1>

            <p className="mt-3 text-sm text-hero-muted leading-relaxed max-w-sm mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              No account needed. Select your network, choose a plan, get data delivered in seconds.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <Button asChild size="lg" className="h-11 px-6 rounded-xl text-sm font-bold shadow-lg">
                <Link to="/buy">
                  Buy Data Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 px-6 rounded-xl text-sm font-bold border-hero-foreground/15 text-hero-foreground/70 hover:text-hero-foreground hover:bg-hero-foreground/5 bg-transparent"
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
      <section className="border-b bg-card/60">
        <div className="container py-3.5">
          <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <item.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NETWORK QUICK ENTRY ─── */}
      <section className="container py-9 sm:py-12">
        <div className="text-center mb-5">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground">Choose Your Network</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Select a network to start buying</p>
        </div>
        <div className="flex gap-2.5 max-w-sm mx-auto">
          {NETWORKS.map((net) => (
            <Link
              key={net.name}
              to={`/buy?network=${net.name}`}
              className={`group flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${net.bg}`}
            >
              <span className={`h-3 w-3 rounded-full ${net.dot} shadow-sm`} />
              <span className="text-sm font-extrabold text-foreground">{net.name}</span>
              <span className="text-[10px] font-medium text-muted-foreground">Buy →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-muted/30 border-y">
        <div className="container py-9 sm:py-12">
          <div className="text-center mb-5">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="p-4 rounded-xl bg-card border border-border/60 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-extrabold text-primary tracking-wider">{step.num}</span>
                </div>
                <h3 className="text-xs font-bold text-foreground mb-0.5">{step.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY KAIFERDATA ─── */}
      <section className="container py-9 sm:py-12">
        <div className="text-center mb-5">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground">Why Kaiferdata</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="p-3.5 rounded-xl border border-border/60 bg-card hover:shadow-sm transition-shadow"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <feat.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-[12px] font-bold text-foreground mb-0.5">{feat.title}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="container pb-10 sm:pb-14">
        <div className="relative rounded-2xl overflow-hidden bg-hero-gradient p-6 sm:p-8 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-[-40%] right-[-10%] w-[250px] h-[250px] rounded-full bg-primary/8 blur-[80px]" />
          </div>
          <div className="relative">
            <h2 className="text-base sm:text-lg font-extrabold text-hero-foreground mb-1.5">
              Ready to get your data?
            </h2>
            <p className="text-xs text-hero-muted mb-4 max-w-xs mx-auto">
              Buy data in seconds — no account required.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <Button asChild size="lg" className="h-10 px-6 rounded-xl text-sm font-bold shadow-lg">
                <Link to="/buy">Buy Data Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-10 px-6 rounded-xl text-sm font-bold border-hero-foreground/15 text-hero-foreground/70 hover:text-hero-foreground hover:bg-hero-foreground/5 bg-transparent"
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
