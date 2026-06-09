import React from "react";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SOCIAL_PROFILES, abs } from "@/lib/seo/site";
import type { Faq } from "@/lib/seo/faq";

// Server-rendered Schema.org JSON-LD. Feeds entity data straight into the engines'
// knowledge graphs (playbook §3). Pure component — safe in the server tree, so the
// markup is in the raw HTML crawlers read.

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const organizationSchema = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: abs("/assets/clerow-mascot.png"),
  description: SITE_DESCRIPTION,
  sameAs: SOCIAL_PROFILES,
});

export const softwareApplicationSchema = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "AI Visibility / Generative Engine Optimization (GEO/AEO)",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "29",
    priceCurrency: "USD",
    description: "$29/month, self-serve, cancel anytime. Free first scan and Level 1 fixes.",
    url: abs("/pricing"),
  },
});

export const faqPageSchema = (faqs: Faq[]): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
