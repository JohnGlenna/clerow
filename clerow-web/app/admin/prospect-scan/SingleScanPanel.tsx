"use client";

// Single-prospect form. Also the landing surface for Discover's "Scan" /
// "View scan" handoff: a new prefill fills the form and auto-runs (or loads
// the stored scan when scanId is set).

import { useEffect, useRef, useState } from "react";

import type { Lang } from "@/lib/prospect/types";

import { loadScan, runScan, type Scan } from "./api";
import { ScanResult } from "./ScanResult";

export type ScanPrefill = {
  nonce: number;
  brand: string;
  website: string;
  email?: string | null;
  scanId?: string | null;
};

export function SingleScanPanel({ prefill }: { prefill: ScanPrefill | null }) {
  const [brand, setBrand] = useState("");
  const [website, setWebsite] = useState("");
  const [language, setLanguage] = useState<Lang>("no");
  const [promptOverride, setPromptOverride] = useState("");
  const [prospectEmail, setProspectEmail] = useState<string | null>(null);

  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenNonce = useRef(0);

  const run = async (input: { brand: string; website: string; force?: boolean }) => {
    setBusy(true);
    setError(null);
    try {
      const result = await runScan({
        ...input,
        language,
        promptOverride: promptOverride.trim() || undefined,
      });
      setScan(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!prefill || prefill.nonce === seenNonce.current) return;
    seenNonce.current = prefill.nonce;
    setBrand(prefill.brand);
    setWebsite(prefill.website);
    setProspectEmail(prefill.email || null);
    setScan(null);
    setError(null);
    if (prefill.scanId) {
      setBusy(true);
      loadScan(prefill.scanId)
        .then(setScan)
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load scan"))
        .finally(() => setBusy(false));
    } else if (prefill.brand && prefill.website) {
      void run({ brand: prefill.brand, website: prefill.website });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !website.trim() || busy) return;
    void run({ brand: brand.trim(), website: website.trim() });
  };

  return (
    <div>
      <form className="lp-card ps-form" onSubmit={submit}>
        <div className="ps-form-grid">
          <label>
            Brand name
            <input
              className="ps-input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Regnskapshuset Sør AS"
              required
            />
          </label>
          <label>
            Website
            <input
              className="ps-input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="regnskapshuset.no"
              required
            />
          </label>
          <label>
            Email language
            <span className="ps-lang">
              <button
                type="button"
                className={`ps-chip ${language === "no" ? "on" : ""}`}
                onClick={() => setLanguage("no")}
              >
                Norsk
              </button>
              <button
                type="button"
                className={`ps-chip ${language === "en" ? "on" : ""}`}
                onClick={() => setLanguage("en")}
              >
                English
              </button>
            </span>
          </label>
        </div>
        <details className="ps-override">
          <summary>Override prompts (optional — one per line, skips prompt generation)</summary>
          <textarea
            className="ps-input"
            rows={6}
            value={promptOverride}
            onChange={(e) => setPromptOverride(e.target.value)}
            placeholder={"beste regnskapsbyrå i Kristiansand\nregnskapsfører for små bedrifter anbefaling\n…"}
          />
        </details>
        <div className="ps-form-actions">
          <button className="ps-btn ps-btn-primary" type="submit" disabled={busy}>
            {busy ? "Scanning… (~20–40s)" : "Scan prospect"}
          </button>
          {error && <span className="ps-error">{error}</span>}
        </div>
      </form>

      {scan && (
        <div className="lp-card">
          <ScanResult
            scan={scan}
            prospectEmail={prospectEmail}
            busy={busy}
            onForceRescan={() =>
              void run({ brand: scan.brand, website: scan.website, force: true })
            }
          />
        </div>
      )}
    </div>
  );
}
