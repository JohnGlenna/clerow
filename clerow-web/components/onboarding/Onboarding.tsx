"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MascotClerow } from "../Mascot";
import { DiscoverCard } from "../scan/DiscoverCard";
import { ResultTable } from "../scan/ResultTable";
import type { DiscoverResponse, RunResponse } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One scan, one screen. The user gives us a URL (often already passed from the
// landing page via ?url=); we derive their profile, discover the prompts their
// customers ask, run the primary prompt through Perplexity, and show where they
// stand — then point them at the (mostly locked) dashboard to rank higher.
type Phase = "idle" | "reading" | "discovering" | "discovered" | "scanning" | "done" | "error";

export function Onboarding() {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [discover, setDiscover] = React.useState<DiscoverResponse | null>(null);
  const [result, setResult] = React.useState<RunResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const started = React.useRef(false);

  const run = React.useCallback(async (siteUrl: string) => {
    const clean = siteUrl.trim();
    if (!clean) return;
    setError(null);
    try {
      // 1. Read the site → derive + persist the profile, get a brandId.
      setPhase("reading");
      const brandRes = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clean }),
      });
      if (!brandRes.ok) throw new Error((await brandRes.json()).error ?? "Could not read your site");
      const { brandId } = await brandRes.json();

      // 2. Discover the prompt set (Step 1 card).
      setPhase("discovering");
      const dRes = await fetch("/api/scan/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      if (!dRes.ok) throw new Error((await dRes.json()).error ?? "Prompt discovery failed");
      const d: DiscoverResponse = await dRes.json();
      setDiscover(d);
      setPhase("discovered");
      await sleep(1800); // let the user read Step 1

      // 3. Run the primary prompt through Perplexity (Step 2 result).
      setPhase("scanning");
      const rRes = await fetch("/api/scan/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      if (!rRes.ok) throw new Error((await rRes.json()).error ?? "Scan failed");
      const r: RunResponse = await rRes.json();
      setResult(r);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }, []);

  // Auto-start when the landing page handed us a URL via ?url=.
  React.useEffect(() => {
    const param = (new URLSearchParams(window.location.search).get("url") ?? "").trim();
    if (param) {
      setUrl(param);
      if (!started.current) {
        started.current = true;
        run(param);
      }
    }
  }, [run]);

  const start = () => {
    if (!url.trim() || started.current) return;
    started.current = true;
    run(url);
  };

  const retry = () => {
    started.current = true;
    run(url);
  };

  const company =
    result?.brands.find((b) => b.isYou)?.name ?? "";

  return (
    <div className="onboard-page">
      <header className="onboard-top">
        <div className="shell shell--narrow onboard-top-inner">
          <a className="brand" href="/" style={{ fontSize: 20 }}>
            <MascotClerow size={32} />
            Clerow
          </a>
          <a className="onboard-skip" href="/dashboard">
            Skip for now →
          </a>
        </div>
      </header>

      <div className="onboard-body">
        {phase === "idle" ? (
          <UrlStep url={url} setUrl={setUrl} onStart={start} />
        ) : (
          <ScanStep
            url={url}
            company={company}
            phase={phase}
            discover={discover}
            result={result}
            error={error}
            onRetry={retry}
            onContinue={() => router.push("/dashboard")}
          />
        )}
      </div>
    </div>
  );
}

function UrlStep({
  url,
  setUrl,
  onStart,
}: {
  url: string;
  setUrl: (s: string) => void;
  onStart: () => void;
}) {
  return (
    <div className="onboard-card">
      <div className="onboard-mascot">
        <MascotClerow size={96} float />
      </div>
      <h1 className="onboard-h">What site should we scan?</h1>
      <p className="onboard-sub">
        Just your domain. We&apos;ll figure out the rest and show you exactly where AI recommends
        your competitors instead of you.
      </p>

      <div className="input-with-prefix">
        <span className="px">https://</span>
        <input
          autoFocus
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourstartup.com"
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) onStart();
          }}
        />
      </div>

      <div className="onboard-actions">
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>
          🔒 Public pages only · we don&apos;t crawl logged-in routes
        </span>
        <div className="right">
          <button className="btn btn--primary btn--lg" onClick={onStart} disabled={!url.trim()}>
            Scan my site
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ScanStep({
  url,
  company,
  phase,
  discover,
  result,
  error,
  onRetry,
  onContinue,
}: {
  url: string;
  company: string;
  phase: Phase;
  discover: DiscoverResponse | null;
  result: RunResponse | null;
  error: string | null;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const busy = phase === "reading" || phase === "discovering" || phase === "scanning";

  return (
    <div className="onboard-card onboard-card--wide">
      <h1 className="onboard-h">
        {phase === "done"
          ? `Here's where you stand${company ? `, ${company}` : ""}.`
          : phase === "error"
            ? "We hit a snag."
            : "Scanning your site…"}
      </h1>
      <p className="onboard-sub">
        {phase === "done"
          ? "This is your starting line. Your dashboard turns this into daily wins."
          : phase === "error"
            ? error
            : "Hang tight — this is the only time you'll wait. Every other scan runs in the background."}
      </p>

      {/* Step 1 result */}
      {discover && (
        <div style={{ marginTop: 8 }}>
          <DiscoverCard url={url || "your site"} data={discover} />
        </div>
      )}

      {/* In-progress spinner */}
      {busy && (
        <div className="scanning" style={{ marginTop: 16 }}>
          <div className="scan-orbit" aria-hidden="true">
            <div className="spin1"><span className="dot" /></div>
            <div className="spin2"><span className="dot d2" /></div>
            <div className="ring" />
            <div className="ring r2" />
            <div className="center"><MascotClerow size={64} float /></div>
          </div>
          <div className="scan-tasks">
            <div className={`scan-task ${phase === "reading" ? "active" : "done"}`}>
              <span className="tick">{phase === "reading" ? "•" : "✓"}</span>
              <span>Reading your site &amp; building your profile</span>
            </div>
            <div className={`scan-task ${phase === "discovering" ? "active" : discover ? "done" : "pending"}`}>
              <span className="tick">{phase === "discovering" ? "•" : discover ? "✓" : ""}</span>
              <span>Discovering the prompts your customers ask</span>
            </div>
            <div className={`scan-task ${phase === "scanning" ? "active" : "pending"}`}>
              <span className="tick">{phase === "scanning" ? "•" : ""}</span>
              <span>Running your top prompt through Perplexity</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 result */}
      {phase === "done" && result && (
        <div style={{ marginTop: 16 }}>
          <ResultTable engine={result.engine} prompt={result.prompt} brands={result.brands} />
        </div>
      )}

      <div className="onboard-actions" style={{ marginTop: 16 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>
          {phase === "done" ? "🏅 First Scan badge unlocked!" : busy ? "Working…" : ""}
        </span>
        <div className="right">
          {phase === "error" ? (
            <button className="btn btn--primary btn--lg" onClick={onRetry}>
              Try again
            </button>
          ) : (
            <button className="btn btn--lg btn--primary" onClick={onContinue} disabled={phase !== "done"}>
              {phase === "done" ? "See how to rank higher" : "Please wait…"}
              {phase === "done" && <span className="arrow">→</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
