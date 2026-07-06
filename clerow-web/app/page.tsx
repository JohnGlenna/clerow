import "./welcome/welcome.css";
import type { Metadata } from "next";
import { WelcomePage } from "@/components/welcome/WelcomePage";
import { JsonLd, organizationSchema, softwareApplicationSchema, faqPageSchema } from "@/components/seo/JsonLd";
import { FAQS } from "@/lib/seo/faq";

// Freshness signal for crawlers (GEO playbook): keep in sync with the visible
// "Data current as of" line in the homepage stats band.
export const metadata: Metadata = {
  other: { "article:modified_time": "2026-07-06" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationSchema(), softwareApplicationSchema(), faqPageSchema(FAQS)]} />
      <WelcomePage />
    </>
  );
}
