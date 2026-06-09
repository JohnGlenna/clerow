import type { Metadata } from "next";
import { StartButton } from "@/components/welcome/Cta";
import { JsonLd, faqPageSchema } from "@/components/seo/JsonLd";
import { FAQS } from "@/lib/seo/faq";

export const metadata: Metadata = {
  title: "Clerow FAQ — AI Visibility & GEO/AEO Questions",
  description:
    "Answers to common questions about Clerow, GEO/AEO (AI visibility), the 5 AI engines it tracks, pricing, and how the scan-and-fix loop works.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQS)} />
      <span className="eyebrow">FAQ</span>
      <h1>Clerow — frequently asked questions</h1>
      <p className="lede">
        Everything you need to know about Clerow and getting your brand recommended by AI answer
        engines. Clerow is a $29/month AI visibility (GEO/AEO) tool that scans your site across
        ChatGPT, Claude, Perplexity, Gemini, and Grok and turns the gaps into daily fixes.
      </p>

      {FAQS.map((f, i) => (
        <div key={i} className="faq-q">
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}

      <div className="content-cta">
        <h2>See where AI ranks you</h2>
        <p>Your first scan and Level 1 fixes are free. Paste your URL and find out in minutes.</p>
        <StartButton className="btn btn-primary">Get started</StartButton>
      </div>
    </>
  );
}
