import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { CLERO } from "@/lib/clero";
import "./clero.css";

// Clero (iOS quit-nicotine app) is a separate product hosted on clerow.com under
// /clero until it gets its own domain. This layout deliberately renders none of
// the Clerow chrome and carries its own fonts, footer and metadata.

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--clero-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--clero-body",
  display: "swap",
});

const TITLE = `${CLERO.name} — ${CLERO.tagline}`;
const DESCRIPTION =
  "Vapes, cigarettes, pouches, snus — Clero tracks your streak and the cash you're not spending, and gives you a one-tap rescue when a craving hits.";

export const metadata: Metadata = {
  title: { default: TITLE, template: `%s · ${CLERO.name}` },
  description: DESCRIPTION,
  applicationName: CLERO.name,
  alternates: { canonical: "/clero" },
  openGraph: {
    type: "website",
    siteName: CLERO.name,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/clero/hero.png", width: 320, height: 320, alt: "Clero coach illustration" }],
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION, images: ["/clero/hero.png"] },
  icons: { icon: "/clero/hero.png", apple: "/clero/hero.png" },
};

export default function CleroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`clero ${display.variable} ${body.variable}`}>
      <main>{children}</main>
    </div>
  );
}
