"use client";

// Outbox: the autopilot's hand-off point. The pipeline (daily cron or the
// button here) has already discovered, quality-checked, scanned, and drafted —
// every card just needs a human glance and one click on Send. Sending goes
// through John's own Gmail (replies land in the normal inbox); Skip parks the
// lead as rejected.

import { useCallback, useEffect, useState } from "react";

import type { ScanHandoff } from "./DiscoverTab";
import {
  fetchAutopilot,
  fetchAutosend,
  fetchOutbox,
  patchLeadStatus,
  runPipeline,
  sendLeadEmail,
  setAutopilot,
  setAutosend,
  stopLeadSequence,
  type FollowupRow,
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
  // null = unknown (still loading); the kill switch that gates both scan crons.
  const [autopilot, setAutopilotState] = useState<boolean | null>(null);
  const [autopilotBusy, setAutopilotBusy] = useState(false);
  // Same pattern for the auto-send drip cron (separate switch from scanning).
  const [autosend, setAutosendState] = useState<boolean | null>(null);
  const [autosendBusy, setAutosendBusy] = useState(false);
  // Set when the cron paused itself (e.g. Gmail refused the SMTP login).
  const [pausedReason, setPausedReason] = useState<string | null>(null);

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
    void fetchAutopilot()
      .then((a) => setAutopilotState(a.enabled))
      .catch(() => setAutopilotState(null));
    void fetchAutosend()
      .then((a) => {
        setAutosendState(a.enabled);
        setPausedReason(a.pausedReason);
      })
      .catch(() => setAutosendState(null));
  }, [refresh]);

  const toggleAutopilot = async () => {
    setAutopilotBusy(true);
    try {
      const next = await setAutopilot(!(autopilot ?? false));
      setAutopilotState(next.enabled);
    } catch (e) {
      setPipelineMsg(e instanceof Error ? e.message : "Could not change automated scanning");
    } finally {
      setAutopilotBusy(false);
    }
  };

  const toggleAutosend = async () => {
    setAutosendBusy(true);
    try {
      const next = await setAutosend(!(autosend ?? false));
      setAutosendState(next.enabled);
      setPausedReason(next.pausedReason);
    } catch (e) {
      setPipelineMsg(e instanceof Error ? e.message : "Could not change auto-send");
    } finally {
      setAutosendBusy(false);
    }
  };

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
        <span className="ps-badge ps-badge-emailed">
          follow-ups due <b>{data ? data.followups.filter((f) => f.due).length : "–"}</b>
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
        <button
          className={`ps-btn ${autopilot ? "ps-btn-primary" : "ps-btn-ghost"}`}
          onClick={() => void toggleAutopilot()}
          disabled={autopilot === null || autopilotBusy}
          title="Pauses both the daily subscriber re-scan and the prospect autopilot cron"
        >
          {autopilot === null
            ? "Automated scanning…"
            : `Automated scanning: ${autopilot ? "ON" : "OFF"}`}
        </button>
        <button
          className={`ps-btn ${autosend ? "ps-btn-primary" : "ps-btn-ghost"}`}
          onClick={() => void toggleAutosend()}
          disabled={autosend === null || autosendBusy}
          title="Auto-sends the oldest ready draft every 10 min, weekdays ~09–17 Oslo time, up to the daily cap"
        >
          {autosend === null ? "Auto-send…" : `Auto-send: ${autosend ? "ON" : "OFF"}`}
        </button>
      </div>

      {pausedReason && (
        <div className="ps-hint ps-hint-warn">
          ⚠ <b>Auto-send switched itself OFF:</b> {pausedReason}.
          <br />
          To fix: sign in to the Gmail account in a browser and approve the security alert (if still
          blocked, visit accounts.google.com/DisplayUnlockCaptcha), regenerate the app password and
          update <code>GMAIL_APP_PASSWORD</code> in Vercel, send one manual test email from a card
          below — then flip Auto-send back ON, which clears this notice.
        </div>
      )}

      {autosend === true && (
        <div className="ps-hint">
          Auto-send is <b>ON</b> — every 10 minutes (weekdays ~09–17) the drip cron sends up to 5
          emails: due follow-ups first, then the <b>oldest</b> ready drafts, unreviewed, up to the
          daily cap. Edit or Skip any draft below you don’t want going out as-is; use “Stop sequence”
          under Follow-ups to cancel a lead’s emails 2–3.
        </div>
      )}

      {autopilot === false && (
        <div className="ps-hint">
          Automated scanning is <b>OFF</b> — the daily subscriber re-scan and the prospect cron are
          paused, so they spend nothing. Use “Run pipeline now” to scan on demand.
        </div>
      )}

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

      {data && (
        <FollowupsCard
          followups={data.followups}
          onStopped={(leadId) =>
            setData((d) => d && { ...d, followups: d.followups.filter((f) => f.leadId !== leadId) })
          }
        />
      )}
    </div>
  );
}

// --- Follow-ups (drip emails 2–3) -------------------------------------------

function FollowupsCard({
  followups,
  onStopped,
}: {
  followups: FollowupRow[];
  onStopped: (leadId: string) => void;
}) {
  return (
    <div className="lp-card ps-panel">
      <h2>Follow-ups</h2>
      <p className="ps-comps">
        Automatic drip: email 2 goes out 3 days after the first email, email 3 two days later —
        fixed templates, sent as replies in the same thread. What you see here is exactly what will
        be sent. Setting a lead to replied/customer/rejected also stops its sequence.
      </p>
      {followups.length === 0 ? (
        <p className="ps-comps">No follow-ups scheduled — they appear here as first emails go out.</p>
      ) : (
        followups.map((f) => <FollowupRowView key={`${f.leadId}-${f.step}`} f={f} onStopped={onStopped} />)
      )}
    </div>
  );
}

function FollowupRowView({ f, onStopped }: { f: FollowupRow; onStopped: (leadId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stop = async () => {
    setStopping(true);
    setErr(null);
    try {
      await stopLeadSequence(f.leadId);
      onStopped(f.leadId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not stop sequence");
      setStopping(false);
    }
  };

  const when = f.due
    ? "due now — goes out with the next cron tick"
    : `sends ${new Date(f.dueAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ≈09:00`;

  return (
    <div className="ps-fu-row">
      <div className="ps-fu-head">
        <b>{f.name}</b>
        <a
          className="ps-comps"
          href={f.website.startsWith("http") ? f.website : `https://${f.website}`}
          target="_blank"
          rel="noreferrer"
        >
          {f.websiteKey}
        </a>
        <span className="ps-badge ps-badge-emailed">email {f.step} of 3</span>
        <span className="ps-comps">{f.email}</span>
        <span className={`ps-fu-when ${f.due ? "due" : ""}`}>{when}</span>
        <span className="ps-fu-actions">
          <button className="ps-btn ps-btn-ghost" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide email" : "View email"}
          </button>
          <button className="ps-btn ps-btn-ghost" onClick={() => void stop()} disabled={stopping}>
            {stopping ? "Stopping…" : "Stop sequence"}
          </button>
        </span>
      </div>
      {err && <div className="ps-error">{err}</div>}
      {open && (
        <div className="ps-fu-preview">
          <div className="ps-fu-subject">{f.subject}</div>
          <pre className="ps-fu-body">{f.body}</pre>
        </div>
      )}
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
