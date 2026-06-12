"use client";

// One scan's results: headline stat, per-prompt ✓/✗ table, competitor
// leaderboard, and the editable cold email with copy/mailto.

import { useEffect, useState } from "react";

import type { Scan } from "./api";
import { copyScanImage } from "./scanImage";

export function ScanResult({
  scan,
  prospectEmail,
  onForceRescan,
  busy,
}: {
  scan: Scan;
  prospectEmail?: string | null;
  onForceRescan?: () => void;
  busy?: boolean;
}) {
  const [subject, setSubject] = useState(scan.email.subject);
  const [body, setBody] = useState(scan.email.body);
  const [copied, setCopied] = useState<"subject" | "body" | "email" | "image" | "image-dl" | null>(
    null,
  );

  useEffect(() => {
    setSubject(scan.email.subject);
    setBody(scan.email.body);
  }, [scan.id, scan.email.subject, scan.email.body]);

  const copy = async (what: "subject" | "body" | "email", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  const copyImage = async () => {
    const how = await copyScanImage(scan);
    setCopied(how === "copied" ? "image" : "image-dl");
    setTimeout(() => setCopied(null), 1800);
  };

  const mailto = `mailto:${prospectEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // mailto can't attach files, so "open with text AND image" = put the PNG on
  // the clipboard first, then open the draft — one Cmd+V away from complete.
  const openMailWithImage = async () => {
    await copyImage();
    window.location.href = mailto;
  };

  return (
    <div className="ps-result">
      <div className="ps-headline">
        <span className="ps-stat">
          Mentioned in <b>{scan.mentionedCount}/{scan.totalPrompts}</b> ChatGPT answers
        </span>
        <span className="ps-source" title="API answers approximate but aren't identical to chatgpt.com">
          ChatGPT (API)
        </span>
        {scan.cached && (
          <span className="ps-cached">
            Cached {new Date(scan.createdAt).toLocaleDateString()}
            {onForceRescan && (
              <button className="ps-btn ps-btn-ghost" onClick={onForceRescan} disabled={busy}>
                {busy ? "Rescanning…" : "Force rescan"}
              </button>
            )}
          </span>
        )}
      </div>

      <table className="ps-table">
        <thead>
          <tr>
            <th>Buyer prompt</th>
            <th>{scan.brand}?</th>
            <th>Brands recommended</th>
          </tr>
        </thead>
        <tbody>
          {scan.answers.map((a, i) => (
            <tr key={i}>
              <td className="ps-prompt" title={a.answer}>
                “{a.prompt}”
              </td>
              <td className={a.mentioned ? "ps-yes" : "ps-no"}>{a.mentioned ? "✓" : "✗"}</td>
              <td className="ps-comps">
                {a.competitors.join(", ") || "—"}
                {a.otherMentions && a.otherMentions.length > 0 && (
                  <span className="ps-comps-tools"> · tools: {a.otherMentions.join(", ")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {scan.competitors.length > 0 && (
        <div className="ps-leaderboard">
          <h3>Who ChatGPT recommends instead</h3>
          {scan.competitors.slice(0, 8).map((c) => (
            <div key={c.name} className="ps-lb-row">
              <span className="ps-lb-name">{c.name}</span>
              <span className="ps-lb-bar">
                <span
                  className="ps-lb-fill"
                  style={{ width: `${Math.round((c.mentions / scan.totalPrompts) * 100)}%` }}
                />
              </span>
              <span className="ps-lb-count">
                {c.mentions}/{scan.totalPrompts}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="ps-sitepeek">
        <h3>Website signal</h3>
        {scan.sitePeek ? (
          <>
            <p className="ps-peek-meta">
              <b>{scan.sitePeek.title || "(no title)"}</b>
              {scan.sitePeek.description && <> — {scan.sitePeek.description}</>}
            </p>
            {scan.sitePeek.tip ? (
              <p className="ps-peek-tip">
                {scan.sitePeek.tip.observation} <b>{scan.sitePeek.tip.tip}</b>
              </p>
            ) : (
              <p className="ps-peek-warn">
                Homepage was read, but no tip was generated — email has no site reference.
              </p>
            )}
          </>
        ) : (
          <p className="ps-peek-warn">
            Couldn&apos;t read their website — the email has no site reference. Check the domain or
            force a rescan.
          </p>
        )}
      </div>

      <div className="ps-email">
        <h3>Cold email ({scan.language === "no" ? "norsk" : "English"})</h3>
        <input
          className="ps-input ps-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Email subject"
        />
        <textarea
          className="ps-input ps-body"
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Email body"
        />
        <div className="ps-email-actions">
          <button className="ps-btn" onClick={() => copy("body", body)}>
            {copied === "body" ? "Copied!" : "Copy body"}
          </button>
          <button className="ps-btn ps-btn-ghost" onClick={() => copy("subject", subject)}>
            {copied === "subject" ? "Copied!" : "Copy subject"}
          </button>
          <button className="ps-btn ps-btn-ghost" onClick={() => void copyImage()}>
            {copied === "image" ? "Copied!" : copied === "image-dl" ? "Downloaded" : "Copy image"}
          </button>
          <button
            className="ps-btn ps-btn-ghost"
            onClick={() => void openMailWithImage()}
            title="Copies the scan image, then opens the draft with the text — Cmd+V to paste the image in"
          >
            {copied === "image"
              ? "Image on clipboard — Cmd+V"
              : copied === "image-dl"
                ? "Image downloaded — attach it"
                : "Open in mail (+ image)"}
          </button>
          {prospectEmail && (
            <button
              className="ps-prospect-email"
              title="Copy prospect email"
              onClick={() => copy("email", prospectEmail)}
            >
              {copied === "email" ? "Copied!" : prospectEmail}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
