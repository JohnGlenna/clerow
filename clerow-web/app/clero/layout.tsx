import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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

function CleroFooter() {
  return (
    <footer className="clero-footer">
      <Link href="/clero" className="clero-wordmark">
        <Image src="/clero/hero.png" alt="" width={30} height={30} />
        {CLERO.name}
      </Link>
      <p className="clero-tagline">{CLERO.tagline}</p>
      <ul className="clero-links">
        <li>
          <Link href="/clero/terms">Terms of Use</Link>
        </li>
        <li>
          <Link href="/clero/privacy">Privacy Policy</Link>
        </li>
        <li>
          <a href={`mailto:${CLERO.supportEmail}`}>{CLERO.supportEmail}</a>
        </li>
      </ul>
      <hr />
      <p className="clero-copy">
        © 2026 {CLERO.name} · {CLERO.operator}. All rights reserved.
      </p>
      <p className="clero-disclaimer">
        Clero is an educational tool, not a medical device, and does not replace advice from a doctor or a
        quitline. If you are in crisis, contact your local emergency number.
      </p>
    </footer>
  );
}

export default function CleroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`clero ${display.variable} ${body.variable}`}>
      <main>{children}</main>
      <CleroFooter />
    </div>
  );
}
