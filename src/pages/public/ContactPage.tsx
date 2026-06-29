/**
 * ContactPage — Public contact/support page for trust signals and local SEO.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Clock, Shield, HelpCircle, ArrowRight, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData, organizationSchema } from "@/components/seo/StructuredData";

const supportChannels = [
  {
    icon: MessageCircle,
    title: "WhatsApp Support",
    description: "Chat with our support team directly on WhatsApp for instant assistance with orders, payments, or account issues.",
    action: "https://wa.me/233204471969",
    actionLabel: "Chat on WhatsApp",
    external: true,
    color: "text-[#25D366]",
    bg: "bg-[#25D366]/10",
  },
  {
    icon: HelpCircle,
    title: "FAQs & Help Center",
    description: "Find answers to the most common questions about data purchases, delivery times, refunds, and the agent program.",
    action: "/about",
    actionLabel: "View FAQs",
    external: false,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: MapPin,
    title: "Track Your Order",
    description: "Already placed an order? Use your order reference to check the real-time status of your data bundle delivery.",
    action: "/track",
    actionLabel: "Track Order",
    external: false,
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

const infoCards = [
  {
    icon: Clock,
    title: "Response Time",
    description: "We typically respond within 30 minutes during business hours (8 AM – 10 PM GMT).",
  },
  {
    icon: Shield,
    title: "Secure Communication",
    description: "All support interactions are handled securely. We will never ask for your password.",
  },
  {
    icon: Mail,
    title: "Business Inquiries",
    description: "For agent partnerships, bulk orders, or business collaborations, reach out via WhatsApp.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function ContactPage() {
  return (
    <>
      <SEOHead
        title="Contact & Support"
        description="Get help with your Kaiferdata orders, payments, or account. Reach our support team via WhatsApp for instant assistance. Based in Ghana, serving nationwide."
      />
      <StructuredData data={organizationSchema} />

      <div className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <section className="relative pt-16 pb-12 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-25 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent blur-3xl rounded-full" />
          </div>

          <div className="container relative z-10 max-w-3xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-14 w-14 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Contact & <span className="text-gradient-brand">Support</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Need help with an order or have a question? We're here to assist you.
                Our support team is available daily to ensure you have a seamless experience.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container max-w-5xl mx-auto px-4 space-y-20">
          {/* Support Channels */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tight">How Can We Help?</h2>
              <p className="text-muted-foreground mt-2">Choose the best way to reach us or find your answer.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {supportChannels.map((channel, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="glass-card rounded-3xl p-8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-5 ${channel.bg}`}>
                    <channel.icon className={`h-6 w-6 ${channel.color}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{channel.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {channel.description}
                  </p>
                  {channel.external ? (
                    <a
                      href={channel.action}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                    >
                      {channel.actionLabel} <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to={channel.action}
                      className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                    >
                      {channel.actionLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Info Cards */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="glass-strong rounded-3xl p-8 md:p-12">
              <h2 className="text-xl font-bold mb-8 text-center">Good to Know</h2>
              <div className="grid sm:grid-cols-3 gap-6">
                {infoCards.map((card, idx) => (
                  <motion.div key={idx} variants={itemVariants} className="text-center">
                    <div className="h-10 w-10 mx-auto rounded-xl bg-muted flex items-center justify-center mb-4">
                      <card.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-sm mb-2">{card.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center pb-8"
          >
            <h2 className="text-2xl font-bold tracking-tight mb-4">Ready to buy data?</h2>
            <p className="text-muted-foreground mb-6">Skip the wait — purchase your data bundle instantly.</p>
            <Button asChild size="lg" className="h-14 px-10 text-base rounded-full shadow-lg">
              <Link to="/buy">
                Buy Data Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.section>
        </div>
      </div>
    </>
  );
}
