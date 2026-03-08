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
  { name: "MTN", color: "from-[hsl(48_100%_50%/0.12)] to-[hsl(48_100%_50%/0.04)]", border: "border-[hsl(48_100%_50%/0.15)] hover:border-[hsl(48_100%_50%/0.3)]", dot: "bg-network-mtn", glow: "hover:shadow-[0_0_24px_-8px_hsl(48_100%_50%/0.2)]" },
  { name: "Telecel", color: "from-[hsl(0_72%_51%/0.1)] to-[hsl(0_72%_51%/0.03)]", border: "border-[hsl(0_72%_51%/0.12)] hover:border-[hsl(0_72%_51%/0.25)]", dot: "bg-network-telecel", glow: "hover:shadow-[0_0_24px_-8px_hsl(0_72%_51%/0.15)]" },
  { name: "AirtelTigo", color: "from-[hsl(210_80%_52%/0.1)] to-[hsl(210_80%_52%/0.03)]", border: "border-[hsl(210_80%_52%/0.12)] hover:border-[hsl(210_80%_52%/0.25)]", dot: "bg-network-airteltigo", glow: "hover:shadow-[0_0_24px_-8px_hsl(210_80%_52%/0.15)]" },
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
        {/* Ambient light layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[hsl(228_28%_18%/0.6)] blur-[120px]" />
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full bg-[hsl(42_88%_56%/0.04)] blur-[80px]" />
          <div className="absolute bottom-[-15%] right-[-5%] w-[250px] h-[250px] rounded-full bg-[hsl(210_60%_40%/0.03)] blur-[100px]" />
          <div className="absolute bottom-[20%] left-[-8%] w-[180px] h-[180px] rounded-full bg-[hsl(42_88%_56%/0.02)] blur-[60px]" />
        </div>

        <div className="container relative py-16 sm:py-24 lg:py-28">
          <div className="max-w-lg mx-auto text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-[11px] text-muted-foreground mb-6 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              <span>Service Online</span>
              <span className="h-3 w-px bg-border/40" />
              <span>Instant Delivery</span>
            </div>

            <h1 className="text-[1.85rem] sm:text-[2.25rem] lg:text-[2.75rem] font-medium tracking-[-0.02em] text-hero-foreground leading-[1.1] animate-fade-in-up">
              Buy Data Bundles
              <br />
              <span className="text-gradient-gold">Instantly</span>{" "}
              <span className="text-foreground/70">in Ghana</span>
            </h1>

            <p className="mt-5 text-[13px] sm:text-sm text-hero-muted leading-relaxed max-w-[340px] mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              No account needed. Select your network, choose a plan, get data delivered in seconds.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up" style={{ animationDelay: "0.18s" }}>
              <Button asChild size="lg" className="text-[13px]">
                <Link to="/buy">
                  Buy Data Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="glass"
                size="lg"
                asChild
                className="text-[13px] text-muted-foreground hover:text-foreground"
              >
                <Link to="/track">
                  <Search className="mr-2 h-4 w-4" />
                  Track Order
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      </section>

      {/* ─── TRUST STRIP ─── */}
      <section className="glass-subtle border-y-0">
        <div className="container py-4">
          <div className="flex items-center justify-center gap-7 sm:gap-10 flex-wrap">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 text-primary/60" />
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NETWORK QUICK ENTRY ─── */}
      <section className="container py-12 sm:py-16">
        <div className="text-center mb-7">
          <h2 className="text-lg sm:text-xl font-medium text-foreground tracking-tight">Choose Your Network</h2>
          <p className="text-[11px] text-muted-foreground mt-1.5">Select a network to start buying</p>
        </div>
        <div className="flex gap-3 max-w-sm mx-auto">
          {NETWORKS.map((net, i) => (
            <Link
              key={net.name}
              to={`/buy?network=${net.name}`}
              className={`group flex-1 flex flex-col items-center gap-2.5 py-5 rounded-2xl bg-gradient-to-b ${net.color} border ${net.border} transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] ${net.glow} animate-fade-in-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={`h-3 w-3 rounded-full ${net.dot} shadow-sm`} />
              <span className="text-sm font-medium text-foreground/90">{net.name}</span>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground/60 transition-colors">Buy →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section>
        <div className="h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
        <div className="container py-12 sm:py-16">
          <div className="text-center mb-7">
            <h2 className="text-lg sm:text-xl font-medium text-foreground tracking-tight">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="glass-card p-4 rounded-2xl animate-fade-in-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center">
                    <step.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-primary/50 tracking-widest">{step.num}</span>
                </div>
                <h3 className="text-[13px] font-medium text-foreground/90 mb-1">{step.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
      </section>

      {/* ─── WHY KAIFERDATA ─── */}
      <section className="container py-12 sm:py-16">
        <div className="text-center mb-7">
          <h2 className="text-lg sm:text-xl font-medium text-foreground tracking-tight">Why Kaiferdata</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {FEATURES.map((feat, i) => (
            <div
              key={feat.title}
              className="glass-card p-4 rounded-2xl hover:border-muted-foreground/10 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center mb-3">
                <feat.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-[12px] font-medium text-foreground/90 mb-0.5">{feat.title}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="container pb-14 sm:pb-18">
        <div className="relative rounded-2xl overflow-hidden glass-elevated p-8 sm:p-10 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-[hsl(42_88%_56%/0.04)] blur-[80px]" />
            <div className="absolute bottom-[-30%] right-[-10%] w-[200px] h-[200px] rounded-full bg-[hsl(210_60%_40%/0.03)] blur-[60px]" />
          </div>
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-medium text-foreground tracking-tight mb-2">
              Ready to get your data?
            </h2>
            <p className="text-[13px] text-muted-foreground mb-6 max-w-xs mx-auto">
              Buy data in seconds — no account required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="text-[13px]">
                <Link to="/buy">Buy Data Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button
                variant="glass"
                size="lg"
                asChild
                className="text-[13px] text-muted-foreground hover:text-foreground"
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
