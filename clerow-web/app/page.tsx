import "./welcome/welcome.css";
import { WelcomePage } from "@/components/welcome/WelcomePage";
import { JsonLd, organizationSchema, softwareApplicationSchema, faqPageSchema } from "@/components/seo/JsonLd";
import { FAQS } from "@/lib/seo/faq";

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationSchema(), softwareApplicationSchema(), faqPageSchema(FAQS)]} />
      <WelcomePage />
    </>
  );
}
