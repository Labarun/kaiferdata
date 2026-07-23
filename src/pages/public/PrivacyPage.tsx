/**
 * PrivacyPage — Privacy Policy page for trust signals and legal compliance.
 */
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";

const sections = [
  {
    title: "1. Information We Collect",
    content: `When you use Kaiferdata, we may collect the following information: (a) Account information such as your full name, email address, and phone number when you register; (b) Transaction data including purchase history, payment references, and recipient phone numbers; (c) Device and usage data such as browser type, IP address, and pages visited for analytics and security purposes; (d) Wallet and financial data related to your account balance and withdrawal requests.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use your information to: (a) Process and deliver your data bundle purchases; (b) Manage your account, wallet, and transaction history; (c) Provide customer support and resolve order issues; (d) Send important service notifications (order confirmations, delivery updates); (e) Prevent fraud, unauthorized access, and security threats; (f) Improve our platform and user experience through anonymized analytics.`,
  },
  {
    title: "3. Payment Security",
    content: `All payment transactions are processed through Paystack, a PCI-DSS Level 1 compliant payment processor. Kaiferdata does not store, process, or have access to your full credit/debit card details. Payment data is encrypted in transit and at rest according to industry standards. Our wallet system uses secure server-side calculations to prevent manipulation.`,
  },
  {
    title: "4. Data Sharing",
    content: `We do not sell, rent, or trade your personal information to third parties. We may share limited data with: (a) Paystack for payment processing; (b) Telecom network providers (MTN, Telecel, AirtelTigo) to fulfill data bundle orders; (c) Supabase as our database and authentication infrastructure provider; (d) Law enforcement if required by applicable Ghanaian law.`,
  },
  {
    title: "5. Agent Data",
    content: `If you participate in the Kaiferdata Agent Program, additional data may be collected including your storefront name, agent slug, subscription status, and profit earnings. Customer orders placed through your storefront are associated with your agent account for profit tracking. Agent performance metrics are visible to Kaiferdata administrators for program management.`,
  },
  {
    title: "6. Cookies & Local Storage",
    content: `Kaiferdata uses browser local storage to maintain your authentication session and theme preferences. We do not use third-party tracking cookies. Essential storage is used for: (a) Session authentication tokens; (b) Theme preference (light/dark mode); (c) Query cache for improved page load performance.`,
  },
  {
    title: "7. Data Retention",
    content: `We retain your personal data for as long as your account is active or as needed to provide services. Transaction records are retained for a minimum of 5 years for financial reconciliation and legal compliance. You may request account deletion by contacting our support team, after which your personal data will be removed within 30 days, subject to legal retention requirements.`,
  },
  {
    title: "8. Your Rights",
    content: `You have the right to: (a) Access the personal data we hold about you; (b) Request correction of inaccurate data; (c) Request deletion of your account and associated data; (d) Withdraw consent for optional data processing; (e) Receive a copy of your data in a portable format. To exercise any of these rights, please contact our support team via WhatsApp.`,
  },
  {
    title: "9. Children's Privacy",
    content: `Kaiferdata's services are not directed at individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a minor, we will take steps to delete such information promptly.`,
  },
  {
    title: "10. Security Measures",
    content: `We implement appropriate technical and organizational measures to protect your data, including: (a) Encrypted data transmission (HTTPS/TLS); (b) Row-Level Security (RLS) on our database; (c) Secure authentication with Supabase Auth; (d) Server-side validation for all financial operations; (e) Regular security reviews and monitoring.`,
  },
  {
    title: "11. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the Platform after changes constitutes acceptance of the revised policy.`,
  },
  {
    title: "12. Contact Us",
    content: `If you have questions about this Privacy Policy or your data, contact us via WhatsApp at +233 20 447 1969 or visit our Contact page.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SEOHead
        title="Privacy Policy"
        description="Learn how Kaiferdata collects, uses, and protects your personal data. We use Paystack for secure payments and never sell your information to third parties."
      />

      <div className="min-h-[80vh] bg-slate-50 dark:bg-background py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: June 2026
            </p>
            <p className="text-lg text-slate-600 dark:text-muted-foreground leading-relaxed">
              Your privacy matters to us. This policy explains how Kaiferdata handles your data
              and what measures we take to keep it safe.
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
            <Link to="/terms" className="text-primary hover:underline font-medium">
              Terms & Conditions →
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
