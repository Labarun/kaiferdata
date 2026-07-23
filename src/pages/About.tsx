import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData, buildFaqSchema } from "@/components/seo/StructuredData";

const faqs = [
  {
    question: "What is Kaifer Data?",
    answer: "Kaifer Data is a modern platform designed to help customers stay connected by offering affordable data packages for MTN, Telecel, and AirtelTigo networks in Ghana. We coined our name from an ancient Hebrew word which means to cover, and that is exactly what we do: we cover your data needs with the best offers in the market, ensuring you get the most value for your money while enjoying a seamless and secure experience."
  },
  {
    question: "How do I purchase data?",
    answer: "You can purchase data directly from the website with or without creating an account — no signup required. Simply choose your network, select a bundle, enter the recipient number, and pay securely via Paystack. If you have an account, you can also fund your Kaiferdata wallet and make purchases directly from your wallet balance for a faster checkout experience."
  },
  {
    question: "Are my transactions secure?",
    answer: "Absolutely. All payments are processed through Paystack, a PCI-DSS Level 1 compliant payment processor — meaning your card details are encrypted and never stored on our servers. We also use encrypted data transmission (HTTPS/TLS), Row-Level Security on our database, secure authentication, and server-side validation for all financial operations. Your funds and data are always protected."
  },
  {
    question: "What is the Kaiferdata Wallet?",
    answer: "The Kaiferdata Wallet is a feature available to registered users. You can fund your wallet and use it to make instant purchases without going through the payment gateway each time. Wallet funds can only be used for purchases on the platform. For agents, storefront profit earnings are credited directly to your wallet balance and can be withdrawn subject to minimum thresholds."
  },
  {
    question: "Can I become a reseller or agent?",
    answer: (
      <>
        Yes! You can apply to be an agent now. Just sign up or log in to your free Kaiferdata account, navigate to the agent tab, and submit the required information. Your application will be reviewed and approved, typically within 24 hours. Once approved, choose a subscription plan that suits you and start selling through your own personalized storefront.
        <br /><br />
        <Link to="/agent-perks" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
          Read more about the Agent Perks and exclusive offers here &rarr;
        </Link>
      </>
    )
  },
  {
    question: "What perks do I enjoy as an Agent?",
    answer: "As an agent, you get access to exclusive wholesale pricing on all data packages, the ability to earn profit from the prices you set on your storefront, and a dedicated dashboard to manage your sales, customers, and earnings. You also get your own branded storefront URL where your customers can buy directly from you — we handle the backend, order fulfillment, and payout tracking automatically. Agents must maintain a valid subscription to keep their storefront active."
  },
  {
    question: "Why do my orders not go through sometimes even after payment?",
    answer: (
      <>
        Our system is optimized so that once your payment is confirmed, your order is created immediately. If you encounter a network issue or delay, rest assured that your order is being processed — whether or not you were assigned an order ID on screen. We recommend creating an account so you have a full order history to rely on. You can also track any order using the{" "}
        <Link to="/track" className="text-primary hover:underline font-medium">Track Order</Link>
        {" "}page with your order reference.
      </>
    )
  },
  {
    question: "How long does it take for an order to be delivered?",
    answer: "Data bundles are typically delivered within minutes of a successful payment. In some cases, delivery may take 1–24 hours depending on network provider conditions. Kaiferdata is not responsible for delays caused by telecom network issues. If your bundle has not been delivered within 24 hours, please contact our support team via WhatsApp."
  },
  {
    question: "What is the refund policy?",
    answer: (
      <>
        Data bundle services are non-refundable once activated on the recipient's device, as the services cannot be reversed on the provider side. If you enter an incorrect recipient phone number, Kaiferdata cannot be held responsible — we strongly recommend double-checking the number before confirming. However, in cases where a bundle was paid for but not delivered, we will investigate and either fulfill the order or credit your wallet balance. For full details, see our{" "}
        <Link to="/terms" className="text-primary hover:underline font-medium">Terms & Conditions</Link>.
      </>
    )
  },
  {
    question: "Is my personal data safe?",
    answer: (
      <>
        Yes. We only collect the information necessary to process your orders and manage your account (name, email, phone number, transaction data). We do not sell, rent, or trade your personal information to third parties. We use industry-standard security measures including encrypted data transmission, secure authentication, and database-level access controls. For full details on how we handle your data, read our{" "}
        <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
      </>
    )
  },
];

const About = () => {
  return (
    <div className="min-h-[80vh] bg-slate-50 dark:bg-background py-16 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="About Kaiferdata — Affordable Data Bundles in Ghana"
        description="Learn about Kaiferdata, Ghana's trusted platform for affordable MTN, Telecel, and AirtelTigo data bundles. Read FAQs about purchases, delivery, refunds, and the agent program."
        raw
      />
      <StructuredData data={buildFaqSchema(faqs.filter(f => typeof f.answer === 'string').map(f => ({ question: f.question, answer: f.answer as string })))} />
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-5xl">
            About Kaifer Data
          </h1>
          <p className="text-lg text-slate-600 dark:text-muted-foreground leading-relaxed">
            At Kaifer Data, we understand the need to stay connected, either for communication, entertainment or work.
            That is why we have curated a range of services to empower your digital lifestyle with lightning-fast, secure, and affordable data offers.
            We bridge the gap between you and the connectivity you need while helping you do that at a low cost.
            We thought to ourselves - "Would you rather buy 400mb for 3ghc or 1,000MB for Ghc4.4" and with that we set out to create a platform that offers you the best value for your money, without compromising on quality or security.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium text-slate-800 dark:text-foreground/90 hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors font-medium">
            Terms & Conditions
          </Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors font-medium">
            Privacy Policy
          </Link>
          <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors font-medium">
            Contact & Support
          </Link>
        </div>

        {/* WhatsApp Support Button */}
        <div className="flex justify-center pt-2">
          <a
            href="https://wa.me/233204471969"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebd57] text-white px-8 py-4 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            Chat with Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
