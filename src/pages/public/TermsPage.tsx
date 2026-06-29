/**
 * TermsPage — Terms and Conditions page for trust signals and legal compliance.
 */
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing and using Kaiferdata ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you should not use the Platform. Kaiferdata reserves the right to update these terms at any time, and continued use of the Platform constitutes acceptance of any modifications.`,
  },
  {
    title: "2. Services Provided",
    content: `Kaiferdata provides an online platform for purchasing mobile data bundles for MTN, Telecel (formerly Vodafone), and AirtelTigo networks in Ghana. Our services include direct data bundle purchases, order tracking, wallet-based payments, and an agent/reseller program.`,
  },
  {
    title: "3. Account Registration",
    content: `While data purchases can be made without an account, registered users gain access to additional features including wallet functionality, order history, and the ability to apply for the agent program. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate and complete information during registration.`,
  },
  {
    title: "4. Purchases & Payments",
    content: `All purchases are processed in Ghanaian Cedis (GHS). Payments are handled securely through Paystack, a PCI-DSS compliant payment processor. Prices displayed on the Platform are inclusive of all applicable fees unless stated otherwise. Once a data bundle is purchased and activated on the recipient's number, the transaction is considered complete.`,
  },
  {
    title: "5. Delivery & Fulfillment",
    content: `Data bundles are typically delivered within minutes of a successful payment. In some cases, delivery may take up to 1–24 hours depending on network provider conditions. Kaiferdata is not responsible for delays caused by telecom network issues. If a bundle has not been delivered within 24 hours, please contact our support team.`,
  },
  {
    title: "6. Refund Policy",
    content: `Data bundle services are non-refundable once activated on the recipient's device, as the services cannot be reversed on the provider side. If you enter an incorrect recipient phone number, Kaiferdata cannot be held responsible. We strongly recommend verifying the recipient number before confirming your purchase. In cases where a bundle was paid for but not delivered, Kaiferdata will investigate and either fulfill the order or credit your wallet.`,
  },
  {
    title: "7. Agent Program",
    content: `Registered users may apply to become agents (resellers) on the Platform. Agents gain access to wholesale pricing and can sell data bundles through their personalized storefront. Agent applications are subject to review and approval. Agents must maintain a valid subscription to keep their storefront active. Commission earnings are calculated server-side and credited to the agent's wallet balance. Kaiferdata reserves the right to suspend or terminate any agent account for violation of these terms.`,
  },
  {
    title: "8. Wallet System",
    content: `Registered users can fund their Kaiferdata wallet to make purchases without going through the payment gateway each time. Wallet funds are non-transferable to other users and can only be used for purchases on the Platform. Wallet balances may be subject to withdrawal via the agent withdrawal system, subject to applicable terms and minimum thresholds.`,
  },
  {
    title: "9. Prohibited Activities",
    content: `You agree not to: (a) use the Platform for any unlawful purpose; (b) attempt to gain unauthorized access to the Platform or other users' accounts; (c) manipulate pricing, commission calculations, or any system mechanisms; (d) use automated scripts or bots to interact with the Platform; (e) resell or redistribute Platform services outside of the authorized agent program.`,
  },
  {
    title: "10. Limitation of Liability",
    content: `Kaiferdata provides its services on an "as is" basis. While we strive for 100% uptime and instant delivery, we do not guarantee uninterrupted service. Kaiferdata shall not be liable for any indirect, incidental, or consequential damages arising from the use of the Platform, including but not limited to loss of data, revenue, or profits.`,
  },
  {
    title: "11. Intellectual Property",
    content: `All content on the Platform, including logos, designs, text, and software, is the intellectual property of Kaiferdata and its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.`,
  },
  {
    title: "12. Contact Information",
    content: `For questions or concerns regarding these Terms and Conditions, please contact our support team via WhatsApp at +233 20 447 1969 or visit our Contact page.`,
  },
];

export default function TermsPage() {
  return (
    <>
      <SEOHead
        title="Terms & Conditions"
        description="Read the Terms and Conditions for using Kaiferdata, Ghana's affordable data bundle platform. Covers purchases, refunds, agent program, and user responsibilities."
      />

      <div className="min-h-[80vh] bg-slate-50 dark:bg-background py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-5xl">
              Terms & Conditions
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: June 2026
            </p>
            <p className="text-lg text-slate-600 dark:text-muted-foreground leading-relaxed">
              Please read these terms carefully before using the Kaiferdata platform.
              By using our services, you agree to these terms.
            </p>
          </div>

          {/* Sections */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border p-6 sm:p-8 space-y-8">
            {sections.map((section, idx) => (
              <div key={idx}>
                <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-3">
                  {section.title}
                </h2>
                <p className="text-slate-600 dark:text-muted-foreground leading-relaxed text-sm">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Footer Links */}
          <div className="flex justify-center gap-6 text-sm">
            <Link to="/privacy" className="text-primary hover:underline font-medium">
              Privacy Policy →
            </Link>
            <Link to="/contact" className="text-primary hover:underline font-medium">
              Contact Support →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
