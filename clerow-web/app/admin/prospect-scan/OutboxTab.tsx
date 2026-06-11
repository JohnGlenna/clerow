"use client";

// Outbox: the autopilot's hand-off point. The pipeline (daily cron or the
// button here) has already discovered, quality-checked, scanned, and drafted —
// every card just needs a human glance and one click on Send. Sending goes
// through John's own Gmail (replies land in the normal inbox); Skip parks the
// lead as rejected.

import { useCallback, useEffect, useState } from "react";

import type { ScanHandoff } from "./DiscoverTab";
import {
  fetchOutbox,
  patchLeadStatus,
  runPipeline,
  sendLeadEmail,
  type OutboxResponse,
  type OutboxRow,
  type PipelineSummary,
} from "./api";

export function OutboxTab({ onScan }: { onScan: (h: ScanHandoff) => void }) {
  const [data, setData] = useState<OutboxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await fetchOutbox());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load outbox");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runNow = async () => {
    setPipelineBusy(true);
    setPipelineMsg(null);
    try {
      const s: PipelineSummary = await runPipeline(3);
      const errs = s.errors.length ? ` · ${s.errors.length} errors` : "";
      const time = s.ranOutOfTime ? " · stopped at time budget" : "";
      setPipelineMsg(
        `Done: ${s.scanned.length} ready · ${s.rejected.length} rejected by quality gate · ${s.queued} still queued${errs}${time}`,
      );
      await refresh();
    } catch (e) {
      setPipelineMsg(e instanceof Error ? e.message : "Pipeline run failed");
    } finally {
      setPipelineBusy(false);
    }
  };

  const removeRow = (leadId: string, sent: boolean) => {
    setData((d) =>
      d && {
        ...d,
        rows: d.rows.filter((r) => r.leadId !== leadId),
        sentToday: d.sentToday + (sent ? 1 : 0),
      },
    );
  };

  return (
    <div className="ps-outbox">
      <div className="lp-card ps-pipeline">
        <span className="ps-pipeline-title">Outbox</span>
        <span className="ps-badge ps-badge-scanned">
          ready <b>{data?.rows.length ?? "–"}</b>
        </span>
        <span className="ps-badge ps-badge-emailed">
          sent 24h <b>{data ? `${data.sentToday}/${data.cap}` : "–"}</b>
        </span>
        <span className="ps-badge ps-badge-new">
          queued <b>{data?.queued ?? "–"}</b>
        </span>
        <button className="ps-btn ps-btn-primary" onClick={() => void runNow()} disabled={pipelineBusy}>
          {pipelineBusy ? "Running… (~1–2 min)" : "Run pipeline now"}
        </button>
        <button className="ps-btn ps-btn-ghost" onClick={() => void refresh()} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {pipelineMsg && <div className="ps-hint">{pipelineMsg}</div>}
      {error && <div className="ps-error">{error}</div>}
      {data && !data.sendConfigured && (
        <div className="ps-hint">
          Direct sending is off — set <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code> in the
          env. Until then, use “Open in mail”.
        </div>
      )}

      {data && data.rows.length === 0 && !busy && (
        <div className="lp-card ps-panel">
          <p className="ps-comps">
            Nothing ready to send. Run the pipeline to discover, quality-check and scan new leads — or
            scan something manually; every scanned lead lands here.
          </p>
        </div>
      )}

      {data?.rows.map((row) => (
        <OutboxCard
          key={row.leadId}
          row={row}
          sendConfigured={data.sendConfigured}
          capReached={data.sentToday >= data.cap}
          onScan={onScan}
          onGone={removeRow}
        />
      ))}
    </div>
  );
}

function OutboxCard({
  row,
  sendConfigured,
  capReached,
  onScan,
  onGone,
}: {
  row: OutboxRow;
  sendConfigured: boolean;
  capReached: boolean;
  onScan: (h: ScanHandoff) => void;
  onGone: (leadId: string, sent: boolean) => void;
}) {
  const [to, setTo] = useState(row.email ?? "");
  const [subject, setSubject] = useState(row.subject);
  const [body, setBody] = useState(row.body);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validTo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to.trim());
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const send = async () => {
    setSending(true);
    setErr(null);
    try {
      await sendLeadEmail(row.leadId, { to: to.trim(), subject, body });
      onGone(row.leadId, true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed");
      setSending(false);
    }
  };

  const skip = async () => {
    try {
      await patchLeadStatus(row.leadId, "rejected");
      onGone(row.leadId, false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Skip failed");
    }
  };

  return (
    <div className="lp-card ps-panel ps-ob-card">
      <div className="ps-ob-head">
        <b>{row.name}</b>
        <a
          className="ps-comps"
          href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
          target="_blank"
          rel="noreferrer"
        >
          {row.websiteKey}
        </a>
        <span className={`ps-badge ${row.mentionedCount === 0 ? "ps-badge-rejected" : "ps-badge-scanned"}`}>
          {row.mentionedCount}/{row.totalPrompts} mentions
        </span>
        {row.topCompetitor && <span className="ps-comps">top: {row.topCompetitor}</span>}
        <span className="ps-comps">
          {row.source} · scanned {new Date(row.scanCreatedAt).toLocaleDateString()} ·{" "}
          {row.language === "no" ? "norsk" : "English"}
        </span>
      </div>

      <div className="ps-ob-fields">
        <input
          className="ps-input"
          placeholder="prospect@email.com — no address found, paste one"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Recipient"
        />
        <input
          className="ps-input ps-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Email subject"
        />
        <textarea
          className="ps-input ps-body"
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Email body"
        />
      </div>

      {err && <div className="ps-error">{err}</div>}

      <div className="ps-email-actions">
        <button
          className="ps-btn ps-btn-primary"
          onClick={() => void send()}
          disabled={!sendConfigured || !validTo || sending || capReached}
          title={
            !sendConfigured
              ? "Set GMAIL_USER / GMAIL_APP_PASSWORD to enable"
              : capReached
                ? "Daily send cap reached"
                : !validTo
                  ? "Add a recipient address"
                  : "Send through your Gmail"
          }
        >
          {sending ? "Sending…" : "Send email"}
        </button>
        <a className="ps-btn ps-btn-ghost" href={mailto}>
          Open in mail
        </a>
        <button
          className="ps-btn ps-btn-ghost"
          onClick={() =>
            onScan({ brand: row.name, website: row.website, email: to || null, scanId: row.scanId })
          }
        >
          View scan
        </button>
        <button className="ps-btn ps-btn-ghost" onClick={() => void skip()} disabled={sending}>
          Skip
        </button>
      </div>
    </div>
  );
}
