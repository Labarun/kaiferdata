/**
 * AgentPerksPage — Public landing page outlining the benefits of becoming an agent.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Store, 
  TrendingUp, 
  Globe, 
  Code2, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  Wallet
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

const perks = [
  {
    icon: TrendingUp,
    title: "Reseller discounts",
    description: "Access exclusive wholesale pricing on all data packages and maximize your profit margin.",
  },
  {
    icon: Globe,
    title: "Your own storefront URL",
    description: "Get a dedicated, branded link to share with your customers. They buy directly from you.",
  },
  {
    icon: Code2,
    title: "Zero coding required",
    description: "We handle all the technical heavy lifting. Your store is set up instantly upon approval.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted infrastructure",
    description: "Enjoy the same secure Paystack flow and fast bundle delivery as the main Kaiferdata platform.",
  },
];

const steps = [
  "Apply in a few minutes",
  "Our team reviews your application",
  "Get approved within ~24 hours",
  "Activate your store",
  "Start selling and earning",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function AgentPerksPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead
        title="Become a Data Reseller Agent"
        description="Join the Kaiferdata Agent Program and start earning by reselling data bundles in Ghana. Get wholesale prices, your own storefront, and automated profit tracking."
      />
      {/* ── Hero Section ── */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent blur-3xl rounded-full mix-blend-screen" />
        </div>

        <div className="container relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="h-16 w-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]"
          >
            <Store className="h-8 w-8 text-primary" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6"
          >
            Turn your network <br className="hidden md:block" />
            into <span className="text-gradient-brand">revenue.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Sell data bundles to friends, family, and colleagues at competitive prices. Keep the markup, grow your customer base, and build your own digital business.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button asChild size="lg" className="h-14 px-8 text-base rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Link to="/dashboard/become-agent">
                Start my application <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <div className="container max-w-5xl mx-auto px-4 space-y-24 mt-10">
        {/* ── Perks Grid ── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Exclusive Agent Perks</h2>
            <p className="text-muted-foreground mt-3">Everything you need to run a successful data reselling business.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {perks.map((perk, idx) => (
              <motion.div key={idx} variants={itemVariants} className="glass-card rounded-3xl p-8 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <perk.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{perk.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{perk.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── How it Works Timeline ── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-strong rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -right-20 -bottom-20 opacity-5 pointer-events-none">
              <Store className="w-96 h-96" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-8 text-foreground/90 uppercase text-xs tracking-widest">How it works</h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {steps.map((step, idx) => (
                <motion.div key={idx} variants={itemVariants} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Marker */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/10 text-primary font-bold text-sm shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {idx + 1}
                  </div>
                  {/* Content box */}
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] glass-subtle p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-medium text-foreground">{step}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Activation Notice */}
            <motion.div variants={itemVariants} className="mt-12 text-center p-6 bg-accent/30 rounded-2xl border border-accent/50">
              <div className="flex justify-center mb-3">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Activation</h4>
              <p className="text-sm font-medium">Once approved, you'll activate your store with a small subscription.</p>
              <p className="text-xs text-muted-foreground mt-1">Pricing shown at activation</p>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Final CTA ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center pb-10"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-6">Ready to start earning?</h2>
          <Button asChild size="lg" className="h-14 px-10 text-base rounded-full shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_60px_-10px_hsl(var(--primary)/0.6)] transition-all">
            <Link to="/dashboard/become-agent">
              Start my application <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.section>
      </div>
    </div>
  );
}
