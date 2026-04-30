import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, ShieldCheck, Wallet, Headset, Clock, Map,
  ArrowRight, Store, Smartphone, CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navigate = useNavigate();
  const [deliverySpeed, setDeliverySpeed] = useState("Swift Delivery");

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "delivery_speed")
        .single();

      if (!error && data?.setting_value) {
        setDeliverySpeed(data.setting_value);
      }
    }
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center overflow-x-hidden">

      {/* ── HERO SECTION ── */}
      <section className="w-full relative flex flex-col items-center justify-center pt-10 pb-10 md:pt-24 md:pb-24 px-4 text-center bg-hero-gradient overflow-hidden border-b border-border/30">
        {/* Layered ambient orbs — deeper, richer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[850px] h-[480px] rounded-full bg-[hsl(213_55%_82%/0.4)] blur-[100px] will-change-transform" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[hsl(192_45%_84%/0.3)] blur-[80px] will-change-transform" />
          <div className="absolute top-[45%] left-[-8%] w-[340px] h-[340px] rounded-full bg-[hsl(213_45%_82%/0.2)] blur-[60px] will-change-transform" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center relative z-10 w-full max-w-5xl mx-auto glass-hero rounded-[3rem] p-8 sm:p-12 md:p-16 border border-border/50 shadow-2xl shadow-primary/5"
        >
          {/* Dynamic Badge */}
          <div className="glass-elevated px-4 py-1.5 rounded-full flex items-center gap-2 mb-8 border border-primary/20 bg-background/40 backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] sm:text-[11px] whitespace-nowrap uppercase tracking-wider font-semibold text-muted-foreground">
              System Online · <span className="text-foreground">{deliverySpeed}</span>
            </span>
          </div>

          <h1 className="text-5xl md:text-4xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
            Purchase Mobile Data <br />
            <span className="text-gradient-brand">Swift Speed & Affordable Prices</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
            KaiferData is a platform for Ghanaian data bundles. Trusted  by over 20,000 users, Kaifer has grown to be a prominent hub for reloading mobile data for MTN, TELECEL & AT.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full px-8 font-bold h-14 text-base shadow-[0_0_40px_-10px_hsl(var(--primary))]"
              onClick={() => navigate("/buy")}
            >
              Buy Data Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto rounded-full px-8 font-bold h-14 text-base glass-card border-border/50 hover:bg-muted/50"
              onClick={() => navigate("/register")}
            >
              <Wallet className="mr-2 h-5 w-5 text-primary" /> Create Free Account
            </Button>
          </div>

          <div className="flex items-center gap-6 mt-10 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-warning" /> Fast Delivery</div>
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Secure Payments</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> No signup required</div>
          </div>
        </motion.div>
      </section>

      {/* ── NETWORKS SECTION ── */}
      <section className="w-full max-w-5xl px-4 py-16 md:py-24 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Networks</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Choose Your Network</h2>
          <p className="text-muted-foreground mt-2">Select your network to view available data bundles tailored for your needs.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            { name: "MTN", desc: "Ghana's largest network", color: "text-[#FFCC00]", bg: "bg-[#FFCC00]/10", ring: "ring-[#FFCC00]/20" },
            { name: "Telecel", desc: "Reliable nationwide coverage", color: "text-[#E60000]", bg: "bg-[#E60000]/10", ring: "ring-[#E60000]/20" },
            { name: "AirtelTigo", desc: "Best value bundles", color: "text-[#0033A0]", bg: "bg-[#0033A0]/10", ring: "ring-[#0033A0]/20" },
          ].map((net, i) => (
            <motion.div
              key={net.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate("/buy")}
              className={`glass-card p-6 rounded-3xl border-border/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer ring-1 ring-inset ${net.ring}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${net.bg}`}>
                <Smartphone className={`h-6 w-6 ${net.color}`} />
              </div>
              <h3 className="text-xl font-bold">{net.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{net.desc}</p>
              <p className="text-sm font-semibold text-foreground">Click to view bundles →</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── WHY CHOOSE US (FEATURES) ── */}
      <section className="w-full max-w-6xl px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Why Kaifer Data?</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">We Provide The Best Offers in Ghana</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">We understand the competitive nature of the telecom industry, hence we provide the best data bundle prices that are affordable and reliable.</p>
          <div className="mt-6 animate-fade-in" style={{ animationDelay: "0.12s" }}>
            <Button variant="outline" size="lg" className="rounded-full glass-subtle border-border/50 text-foreground/80 hover:text-foreground" asChild>
              <Link to="/about">More About Kaifer Data</Link>
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Fast Delivery", desc: "Data bundles delivered straight to your device.", color: "text-warning" },
            { icon: ShieldCheck, title: "Secure Checkout", desc: "Your payments and personal info are protected with top-level security.", color: "text-success" },
            { icon: Wallet, title: "Affordable Prices", desc: "Competitive prices for data bundles on all networks. Get more data for less.", color: "text-primary" },
            { icon: Headset, title: "Active Support", desc: "A dedicated team ready to assist you with any issues or inquiries you may have.", color: "text-info" },
            { icon: Clock, title: "24/7 Availability", desc: "Our platform is always online, and you can purchase data at anytime and any day.", color: "text-foreground" },
            {
              icon: Store,
              title: "Kaifer Agent Program",
              desc: " At Kaifer Data, we provide an affiliate program for agents and any registered user can sign up and start earning commissions off every sales they make.",
              color: "text-primary",
              link: "/agent-perks",
              linkText: "Learn More About Kaifer Agents →"
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 rounded-3xl border-border/40 hover:bg-muted/20 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-5 ring-1 ring-inset ring-foreground/5">
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.desc}</p>

              {feature.link && (
                <Link to={feature.link} className="text-sm font-bold text-primary hover:underline">
                  {feature.linkText}
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── UNLOCK FULL EXPERIENCE ── */}
      <section className="w-full max-w-5xl px-4 py-16 md:py-32 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center w-full glass-card p-10 md:p-16 rounded-[2.5rem] border-border/50 relative overflow-hidden isolate"
        >
          {/* Internal Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[80px] rounded-full pointer-events-none" />

          <p className="text-xs font-bold uppercase tracking-widest text-warning mb-3">Free Kaifer Account</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Get Access to More Exclusive Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
            You can buy data as a guest anytime — but creating a free Kaifer account gives you access to more exclusive features.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12">
            {[
              { icon: Wallet, label: "Wallet System", desc: "Load wallet, enjoy fee-free transfers and purchases." },
              { icon: Map, label: "Order History", desc: "Track past purchases and have access to order history " },
              { icon: Zap, label: "Faster Checkout", desc: "Skip the hassle of re-entering details everytime you shop" },
              { icon: Headset, label: "Get Support", desc: "Get help when you need it. With an account you will have access to all the requisite information we will need to assist you track unfulfilled orders and resolve any issues." }
            ].map((item, i) => (
              <div key={item.label} className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl glass-elevated flex items-center justify-center mb-3 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm">{item.label}</h4>
                <p className="text-[11px] text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="rounded-full px-10 font-bold h-14 text-base"
            onClick={() => navigate("/register")}
          >
            Create A Free Account Today
          </Button>
        </motion.div>
      </section>

    </div>
  );
}
