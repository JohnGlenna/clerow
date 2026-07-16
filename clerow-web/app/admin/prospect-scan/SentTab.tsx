"use client";

// Sent: the outreach send log — every email that actually went out (first
// touches and drip follow-ups), newest first. Click a row to read the exact
// subject + body that was sent.

import { useCallback, useEffect, useState } from "react";

import { fetchSent, type SentResponse, type SentRow } from "./api";

type StepFilter = 0 | 1 | 2 | 3; // 0 = all

export function SentTab() {
  const [data, setData] = useState<SentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<StepFilter>(0);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await fetchSent());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sent emails");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows = (data?.rows ?? []).filter((r) => filter === 0 || r.step === filter);

  return (
    <div className="ps-outbox">
      <div className="lp-card ps-pipeline">
        <span className="ps-pipeline-title">Sent</span>
        <span className="ps-badge ps-badge-emailed">
          sent 24h <b>{data ? `${data.sentToday}/${data.cap}` : "–"}</b>
        </span>
        <span className="ps-badge ps-badge-new">
          total <b>{data?.total ?? "–"}</b>
        </span>
        {([0, 1, 2, 3] as StepFilter[]).map((s) => (
          <button key={s} className={`ps-chip ${filter === s ? "on" : ""}`} onClick={() => setFilter(s)}>
            {s === 0 ? "All" : `Email ${s}`}
          </button>
        ))}
        <button className="ps-btn ps-btn-ghost" onClick={() => void refresh()} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <div className="ps-error">{error}</div>}

      {data && rows.length === 0 && !busy && (
        <div className="lp-card ps-panel">
          <p className="ps-comps">Nothing sent yet{filter !== 0 ? " for this step" : ""}.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="lp-card ps-panel">
          {rows.map((row) => (
            <SentRowView key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function SentRowView({ row }: { row: SentRow }) {
  const [open, setOpen] = useState(false);
  const sent = new Date(row.sentAt);

  return (
    <div className="ps-fu-row">
      <button className="ps-sent-line" onClick={() => setOpen((o) => !o)}>
        <span className="ps-sent-date">
          {sent.toLocaleDateString(undefined, { day: "numeric", month: "short" })}{" "}
          {sent.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className={`ps-badge ${row.step === 1 ? "ps-badge-scanned" : "ps-badge-emailed"}`}>
          email {row.step}
        </span>
        <b>{row.name}</b>
        <span className="ps-comps">{row.toEmail}</span>
        <span className="ps-sent-subject">{row.subject}</span>
      </button>
      {open && (
        <div className="ps-fu-preview">
          <div className="ps-fu-subject">{row.subject}</div>
          <pre className="ps-fu-body">{row.body}</pre>
          {row.website && (
            <a
              className="ps-comps"
              href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
              target="_blank"
              rel="noreferrer"
            >
              {row.websiteKey}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
