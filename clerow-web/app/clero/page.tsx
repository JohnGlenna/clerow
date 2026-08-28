import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { CLERO } from "@/lib/clero";

export const metadata: Metadata = {
  alternates: { canonical: "/clero" },
};

// Hand-dropped assets in public/clero/: the official App Store badge and a
// full-bleed hero background illustration. Both are optional — the page falls
// back to a plain badge and a gradient sky until they exist.
const pub = (file: string) => fs.existsSync(path.join(process.cwd(), "public/clero", file));
const hasAppStoreBadge = pub("app-store-badge.svg");
const hasHeroBg = pub("hero-bg.png");

const FEATURES = [
  {
    icon: "🔥",
    title: "Your streak",
    body: "Every nicotine-free day adds up. Miss one and Clero helps you get straight back on — no reset shame.",
  },
  {
    icon: "💸",
    title: "Money you kept",
    body: "Tell Clero what your habit cost. Watch the savings counter climb in real time, in your currency.",
  },
  {
    icon: "🚀",
    title: "One-tap rescue",
    body: "Craving? Hit rescue. A 3-minute guided ride that gets you past the peak, whenever it hits.",
  },
  {
    icon: "💬",
    title: "Coach Clero",
    body: "A coach that answers at 11pm. Ask anything, vent, or just check in. No lectures.",
  },
];

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.7c.02 2.87 2.52 3.83 2.55 3.84-.02.07-.4 1.37-1.32 2.7-.79 1.16-1.62 2.31-2.92 2.33-1.28.02-1.69-.76-3.15-.76s-1.92.74-3.13.79c-1.25.05-2.21-1.25-3.01-2.4-1.64-2.36-2.89-6.68-1.21-9.6.84-1.45 2.33-2.37 3.95-2.39 1.23-.02 2.4.83 3.15.83.76 0 2.17-1.03 3.66-.88.62.03 2.37.25 3.49 1.89-.09.06-2.08 1.22-2.06 3.65zM13.98 5.6c.67-.81 1.12-1.94.99-3.06-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.87-1.01 2.97 1.07.08 2.17-.55 2.84-1.36z" />
    </svg>
  );
}

function LaurelLeft() {
  return (
    <svg viewBox="0 0 24 40" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-8 6-11 18-6 36l1-.4C3 20 6 10 12 4z" />
      <path d="M13 6c-4 1-6 4-6 8 3-1 5-4 6-8zM9 14c-4 2-5 6-4 10 3-2 4-6 4-10zM7 23c-3 3-3 7-1 10 2-3 2-7 1-10z" />
    </svg>
  );
}

export default function CleroHome() {
  return (
    <>
      <section
        className={`clero-top${hasHeroBg ? " clero-top-bg" : ""}`}
        style={hasHeroBg ? { backgroundImage: "url(/clero/hero-bg.png)" } : undefined}
      >
        <div className="clero-top-inner">
          <span className="clero-brand">{CLERO.name}</span>
          <h1>
            Quit nicotine.
            <br />
            Keep the money.
          </h1>
          <p className="clero-sub">
            Vapes, cigarettes, pouches, snus — Clero tracks your streak and the cash you&rsquo;re not spending, and
            gives you a one&#8209;tap rescue when a craving hits.
          </p>
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
          <p className="clero-android">Android — coming soon</p>
        </div>

        <div className="clero-scene" aria-hidden={hasHeroBg ? true : undefined}>
          <Image
            src="/clero/hero.png"
            alt="Clero, a fluffy white coach, riding a rocket"
            width={320}
            height={320}
            priority
            className="clero-rocket"
          />
        </div>
      </section>

      <section className="clero-story">
        <p>
          Let&rsquo;s be honest — quitting is not one big decision. It&rsquo;s a hundred small ones, mostly late at
          night. Clero is built for those moments: a counter that shows what you&rsquo;ve already won, and a coach
          who picks up when nobody else will.
        </p>
        <p>
          <strong>Start today, see the numbers tomorrow.</strong> No lectures, no shame.
        </p>

        <ul className="clero-chips" aria-label="What Clero helps you quit">
          {["Vapes", "Cigarettes", "Pouches", "Snus"].map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <figure className="clero-laurel">
          <LaurelLeft />
          <blockquote>
            <p>&ldquo;Day 34. The savings counter is the only reason I didn&rsquo;t buy a pack Friday.&rdquo;</p>
            <cite>Early tester</cite>
          </blockquote>
          <span className="clero-laurel-flip">
            <LaurelLeft />
          </span>
        </figure>
      </section>

      <section className="clero-features">
        <h2>
          Built for the moment
          <br />
          the craving hits.
        </h2>
        <div className="clero-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="clero-card">
              <span className="clero-card-icon" aria-hidden="true">
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
        <a className="clero-badge clero-badge-center" href={CLERO.appStoreUrl} aria-label="Download on the App Store">
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
      </section>
    </>
  );
}
