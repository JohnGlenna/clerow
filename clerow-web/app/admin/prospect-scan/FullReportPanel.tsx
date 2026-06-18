"use client";

// Full report panel: run a REAL multi-model scan against a prospect URL and get
// a shareable public report link (the artifact you send when a prospect asks for
// "a full scan report"). Separate from the Scan tab, which runs the lighter
// ChatGPT-only scan that powers outreach emails.

import { useEffect, useState } from "react";

import { fetchReports, generateReport, revokeReport, type ProspectReportRow } from "./api";

export function FullReportPanel() {
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ProspectReportRow[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    fetchReports()
      .then(setReports)
      .catch(() => {
        /* listing is best-effort */
      });
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { url: reportUrl } = await generateReport({ url: url.trim(), company: company.trim() || undefined });
      setUrl("");
      setCompany("");
      load();
      void copy(reportUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate report");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
      setTimeout(() => setCopied((c) => (c === link ? null : c)), 2000);
    } catch {
      /* clipboard blocked — the link is still selectable in the row */
    }
  };

  const revoke = async (token: string) => {
    if (!confirm("Revoke this link? Anyone who has it will get a 404.")) return;
    try {
      await revokeReport(token);
      load();
    } catch {
      /* leave the row as-is on failure */
    }
  };

  return (
    <div>
      <form className="lp-card ps-form" onSubmit={submit}>
        <p className="ps-sub" style={{ marginTop: 0 }}>
          Runs the full scan across all 5 AI models + the synthesis verdict (~1–2 min), then mints a public link with a
          “Get started” CTA that drops the prospect into onboarding pre-filled with their site.
        </p>
        <div className="ps-form-grid">
          <label>
            Website
            <input
              className="ps-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="acme.com"
              required
            />
          </label>
          <label>
            Brand name (optional — derived from the site if blank)
            <input
              className="ps-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc"
            />
          </label>
        </div>
        <div className="ps-form-actions">
          <button className="ps-btn ps-btn-primary" type="submit" disabled={busy}>
            {busy ? "Scanning all models… (~1–2 min)" : "Generate full report"}
          </button>
          {error && <span className="ps-error">{error}</span>}
        </div>
      </form>

      {reports.length > 0 && (
        <div className="lp-card" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Reports</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reports.map((r) => (
              <div
                key={r.token}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid #F0E6CF",
                  opacity: r.revoked ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{r.company || r.website}</div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 13,
                      color: "#5B6472",
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {r.url}
                  </a>
                </div>
                {r.revoked ? (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#B91C1C" }}>revoked</span>
                ) : (
                  <>
                    <button type="button" className="ps-btn" onClick={() => void copy(r.url)}>
                      {copied === r.url ? "Copied!" : "Copy link"}
                    </button>
                    <button type="button" className="ps-btn" onClick={() => void revoke(r.token)}>
                      Revoke
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
