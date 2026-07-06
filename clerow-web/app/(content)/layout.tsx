import "../welcome/welcome.css";
import "./content.css";
import Link from "next/link";
import { MascotClerow } from "@/components/Mascot";
import { StartButton } from "@/components/welcome/Cta";

// Shared chrome for the public content pages (FAQ, pricing, comparisons, roundups).
// Server component so the page bodies render to raw HTML; the only client island is
// the StartButton CTA. Wrapped in .wl-root to inherit the landing design tokens.
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wl-root">
      <header className="content-nav">
        <Link href="/" className="brand"><MascotClerow size={32} /> Clerow</Link>
        <StartButton className="btn btn-primary btn-sm">Get started</StartButton>
      </header>
      <main className="content-page">{children}</main>
      <footer className="content-foot">
        <nav>
          <Link href="/best-geo-tools-2026">Best GEO tools 2026</Link>
          <Link href="/blog/geo-vs-seo">GEO vs SEO</Link>
          <Link href="/blog/how-to-optimize-website-for-chatgpt-perplexity-gemini">Optimize for AI search</Link>
          <Link href="/compare/clerow-vs-profound">Clerow vs Profound</Link>
          <Link href="/compare/clerow-vs-otterly">Clerow vs Otterly.AI</Link>
          <Link href="/compare/clerow-vs-llmometrics">Clerow vs LLMOmetrics</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        <p>© 2026 Clerow · Get recommended by ChatGPT, Claude, Gemini, Grok &amp; Perplexity</p>
      </footer>
    </div>
  );
}
