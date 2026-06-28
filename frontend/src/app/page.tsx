import LandingPage from "../components/LandingPage";
import { faqs, tiers } from "@/lib/landingData";
import { absoluteUrl, defaultSeoDescription, siteName } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Job Matching and ATS Resume Checker",
  description: defaultSeoDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Jobscape AI - AI Job Matching and ATS Resume Checker",
    description: defaultSeoDescription,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jobscape AI - AI Job Matching and ATS Resume Checker",
    description: defaultSeoDescription,
  },
};

export default function Home() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: defaultSeoDescription,
      offers: tiers.map((tier) => ({
        "@type": "Offer",
        name: `${tier.name} plan`,
        price: tier.price.replace("$", ""),
        priceCurrency: "USD",
        url: absoluteUrl("/pricing"),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName,
      url: absoluteUrl("/"),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
