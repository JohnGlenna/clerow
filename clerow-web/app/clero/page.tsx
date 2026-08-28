import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { CLERO } from "@/lib/clero";

export const metadata: Metadata = {
  alternates: { canonical: "/clero" },
};

// The official App Store badge SVG is dropped into public/clero/ by hand; until
// it exists we render a plain black badge with the same wording.
const hasAppStoreBadge = fs.existsSync(path.join(process.cwd(), "public/clero/app-store-badge.svg"));

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.7c.02 2.87 2.52 3.83 2.55 3.84-.02.07-.4 1.37-1.32 2.7-.79 1.16-1.62 2.31-2.92 2.33-1.28.02-1.69-.76-3.15-.76s-1.92.74-3.13.79c-1.25.05-2.21-1.25-3.01-2.4-1.64-2.36-2.89-6.68-1.21-9.6.84-1.45 2.33-2.37 3.95-2.39 1.23-.02 2.4.83 3.15.83.76 0 2.17-1.03 3.66-.88.62.03 2.37.25 3.49 1.89-.09.06-2.08 1.22-2.06 3.65zM13.98 5.6c.67-.81 1.12-1.94.99-3.06-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.87-1.01 2.97 1.07.08 2.17-.55 2.84-1.36z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 3.5v17l9.5-8.5L4 3.5z" fill="#34a853" />
      <path d="M4 3.5l9.5 8.5 3-2.7L5.2 3.2A1 1 0 0 0 4 3.5z" fill="#4285f4" />
      <path d="M4 20.5l9.5-8.5 3 2.7L5.2 20.8A1 1 0 0 1 4 20.5z" fill="#ea4335" />
      <path d="M16.5 9.3l3.3 1.9c.8.5.8 1.2 0 1.7l-3.3 1.8-3-2.7 3-2.7z" fill="#fbbc04" />
    </svg>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 44 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M38 6c-22 18-32 48-30 108" />
      {[16, 30, 44, 58, 72, 86, 100].map((y, i) => {
        const x = 8 + (i < 3 ? 3 - i : 0) * 4 + Math.max(0, i - 3) * 1.2;
        return (
          <g key={y}>
            <path d={`M${x} ${y} q 12 -8 20 -2 q -10 4 -20 2z`} />
            <path d={`M${x + 1} ${y + 7} q 14 2 18 12 q -12 -2 -18 -12z`} />
          </g>
        );
      })}
    </svg>
  );
}

export default function CleroHome() {
  return (
    <section className="clero-hero">
      <div>
        <h1>
          Quit nicotine.
          <br />
          Keep the money.
        </h1>
        <p className="clero-sub">
          Vapes, cigarettes, pouches, snus — Clero tracks your streak and the cash you&rsquo;re not spending, and
          gives you a one&#8209;tap rescue when a craving hits. <strong>Start today, see the numbers tomorrow.</strong>
        </p>
        <p className="clero-small">Your coach Clero is there at 11pm when the craving hits. No lectures, no shame.</p>

        <div className="clero-badges">
          <a className="clero-badge" href={CLERO.appStoreUrl} aria-label="Download on the App Store">
            {hasAppStoreBadge ? (
              <img src="/clero/app-store-badge.svg" alt="Download on the App Store" />
            ) : (
              <>
                <AppleGlyph />
                <span className="clero-badge-text">
                  <small>Download on the</small>
                  <span>App Store</span>
                </span>
              </>
            )}
          </a>
          <div className="clero-badge clero-badge-soon" aria-disabled="true" title="Android — coming soon">
            <PlayGlyph />
            <span className="clero-badge-text">
              <small>Get it on</small>
              <span>Google Play</span>
            </span>
            <span className="clero-soon-pill">Coming soon</span>
          </div>
        </div>

        <figure className="clero-laurel">
          <Laurel />
          <blockquote>
            <p>&ldquo;Day 34. The savings counter is the only reason I didn&rsquo;t buy a pack Friday.&rdquo;</p>
            <cite>— Early tester</cite>
          </blockquote>
          <Laurel flip />
        </figure>
      </div>

      <div className="clero-art">
        <Image src="/clero/hero.png" alt="Clero coach illustration" width={320} height={320} priority />
      </div>
    </section>
  );
}
