"use client";

import { useEffect, useState } from "react";

// Mint / copy / revoke the global investor share link (one link at a time —
// revoking kills it for everyone who has it).
export function InvestorLinkControls() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/investor-link")
      .then((r) => r.json())
      .then((d) => setUrl(d.url ?? null))
      .catch(() => {});
  }, []);

  const mint = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/investor-link", { method: "POST" });
      const d = await r.json();
      if (d.url) setUrl(d.url);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!confirm("Revoke the investor link? Everyone who has the URL loses access.")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/investor-link", { method: "DELETE" });
      setUrl(null);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="adm-kpi" style={{ marginBottom: 18 }}>
      <div className="l">Shareable investor link</div>
      {url ? (
        <>
          <div className="s" style={{ wordBreak: "break-all", marginTop: 8 }}>
            <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>
              {url}
            </a>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="adm-btn" onClick={copy} disabled={busy}>
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <button className="adm-btn" onClick={revoke} disabled={busy} style={{ color: "#FF6B6B" }}>
              Revoke
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="s" style={{ marginTop: 8 }}>
            No active link. Mint one and send it to investors — anyone with the URL sees the live metrics below
            (aggregates only, no customer names or emails).
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="adm-btn primary" onClick={mint} disabled={busy}>
              {busy ? "Creating…" : "Create investor link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
