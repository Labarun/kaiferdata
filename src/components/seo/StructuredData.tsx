/**
 * StructuredData — Injects JSON-LD structured data into the page for
 * rich snippet eligibility in Google Search.
 */

interface StructuredDataProps {
  /** Raw JSON-LD object(s) to inject */
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function StructuredData({ data }: StructuredDataProps) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

/* ─── Pre-built schema factories ─── */

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kaiferdata",
  url: "https://kaiferdata.com",
  logo: "https://kaiferdata.com/icons/apple-touch-icon.png",
  description:
    "Affordable data bundle platform for MTN, Telecel, and AirtelTigo in Ghana. Fast delivery, secure checkout.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: "https://wa.me/233204471969",
    availableLanguage: "English",
  },
  sameAs: [
    "https://whatsapp.com/channel/0029VbCn7xiKbYMWspFUrd2r",
  ],
  areaServed: {
    "@type": "Country",
    name: "Ghana",
  },
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kaiferdata",
  url: "https://kaiferdata.com",
  description:
    "Buy cheap data bundles for MTN, Telecel, and AirtelTigo in Ghana. Instant delivery, no signup required.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://kaiferdata.com/buy?network={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export function buildFaqSchema(
  faqs: { question: string; answer: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
