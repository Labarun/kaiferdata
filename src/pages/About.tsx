import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Kaifer Data?",
    answer: "Kaifer Data, is a modern platform designed to help customers stay connected by offering affordable data packages. We literally coined our name from an ancient hebrew word which means to cover, and that is exactly what we do: we cover your data needs with the best offers in the market, ensuring you get the most value for your money while enjoying a seamless and secure experience."
  },
  {
    question: "How do I purchase data?",
    answer: "You can directly purchase from the website with or without creating an account. If you have an account, after funding your secure wallet, navigate to the 'Buy Data' section to choose your preferred package."
  },
  {
    question: "Are my transactions secure?",
    answer: "Absolutely. As a registered business, we employ industry-standard security protocols and robust reconciliation systems to ensure your funds and data are always protected."
  },
  {
    question: "Can I become a reseller or agent?",
    answer: "Yes! You can apply to be an agent now. Just sign up or login to your free kaifer account - Navigate to the agent tab and present the requisite information. Your agent application will be approved after a review and from there you can choose a subscription suitable for ypu and start selling."
  },
  {
    question: "What Perks do I enjoy as an Agent?",
    answer: "As an agent, you will have access to exclusive wholesale prices, the ability to earn commissions on your sales, and dedicated support to help you succeed in your reselling endeavors.You will also have a dashboard to track your sales, commissions, and manage your customers effectively. We also allow agents to literally create a website for their customers to buy from them directly, and we handle the backend and order fulfillment for them. This means you can create your own brand and customer base while we take care of the technical aspects and ensure smooth transactions and every commission is assigned to your agent account balance seamlessly."
  },
  {
    question: "Why do my orders not go through sometimes even after payment?",
    answer: "Our system is optimized to and extent that once your payment is made your order is created right away: so if you encounter a netwrok issue or delay, please be rest assured that your order is being processed regardless you were assigned an order ID or not. And to prevent you from blindly hoping to receive your order we recommend you create an account. That way there is an order history you can rely on."
  },
  {
    question: "How long does it take for order to be delivered?",
    answer: "Most orders are processed within the first hour of placement but sometimes it can take longer. This is dependent on the network provider most of the time and not us. We recommend you only reach out to our support if you have not received your order within the first 10-24 hours of purchase."
  },
  {
    question: "What is the refund policy?",
    answer: "We do not offer a refund policy as the data services are non-refundable on the provider side once activated, if you enter a wrong number as recipient, we cannot be held responsible. Therefore, we recommend being careful when entering your recipient information."
  }
];

const About = () => {
  return (
    <div className="min-h-[80vh] bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            About Kaifer Data
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            At Kaifer Data, we understand the need to stay connected, either for communication, entertainment or work.
            That is why we have curated a range of services to empower your digital lifestyle with lightning-fast, secure, and affordable data offers.
            We bridge the gap between you and the connectivity you need while helping you do that at a low cost.
            We thought to ourselves - "Would you rather buy 400mb for 3ghc or 1,000MB for Ghc4.4" and with that we set out to create a platform that offers you the best value for your money, without compromising on quality or security.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium text-slate-800 hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* WhatsApp Support Button */}
        <div className="flex justify-center pt-4">
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
