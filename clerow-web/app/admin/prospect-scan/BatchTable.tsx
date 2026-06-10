"use client";

// CSV batch mode: upload the brreg lead script's export, scan each row
// sequentially (one request at a time — rate-limit friendly), expand rows into
// the full result + email. Cached rows (<14 days) come back instantly.

import { Fragment, useRef, useState } from "react";

import { parseProspectCsv } from "@/lib/prospect/csv";
import type { Lang, ProspectCsvRow } from "@/lib/prospect/types";

import { runScan, type Scan } from "./api";
import { ScanResult } from "./ScanResult";

type RowState = {
  row: ProspectCsvRow;
  status: "queued" | "running" | "done" | "error" | "skipped";
  scan?: Scan;
  error?: string;
};

export function BatchTable() {
  const [rows, setRows] = useState<RowState[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [language, setLanguage] = useState<Lang>("no");
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const stopRef = useRef(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    const { rows: parsed, errors } = parseProspectCsv(await file.text());
    setCsvErrors(errors);
    setRows(
      parsed.map((row) => ({
        row,
        status: row.website ? "queued" : "skipped",
        error: row.website ? undefined : "No website in CSV",
      })),
    );
    setExpanded(null);
  };

  const start = async () => {
    setRunning(true);
    stopRef.current = false;
    for (let i = 0; i < rows.length; i++) {
      if (stopRef.current) break;
      // Re-read freshness from state via functional updates only; the loop's
      // copy is fine because nothing else mutates rows while running.
      if (rows[i].status === "done" || rows[i].status === "skipped") continue;
      setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "running" } : r)));
      try {
        const scan = await runScan({
          brand: rows[i].row.navn,
          website: rows[i].row.website,
          category: rows[i].row.niche || rows[i].row.sted || "",
          language,
        });
        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "done", scan } : r)));
      } catch (e) {
        const error = e instanceof Error ? e.message : "Scan failed";
        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "error", error } : r)));
      }
    }
    setRunning(false);
  };

  const doneCount = rows.filter((r) => r.status === "done").length;
  const scannable = rows.filter((r) => r.status !== "skipped").length;

  return (
    <div className="lp-card">
      <div className="ps-batch-controls">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          disabled={running}
        />
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
        {rows.length > 0 && !running && (
          <button className="ps-btn ps-btn-primary" onClick={() => void start()}>
            Scan {scannable} prospects
          </button>
        )}
        {running && (
          <button className="ps-btn" onClick={() => (stopRef.current = true)}>
            Stop after current
          </button>
        )}
        {rows.length > 0 && (
          <span className="ps-progress">
            {doneCount}/{scannable} scanned
          </span>
        )}
      </div>

      {csvErrors.map((e, i) => (
        <div key={i} className="ps-error">
          {e}
        </div>
      ))}

      {rows.length > 0 && (
        <table className="ps-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Website</th>
              <th>Niche</th>
              <th>Email</th>
              <th>Status</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Fragment key={i}>
                <tr
                  className={r.scan ? "ps-row-click" : undefined}
                  onClick={() => r.scan && setExpanded(expanded === i ? null : i)}
                >
                  <td>{r.row.navn}</td>
                  <td className="ps-comps">{r.row.website}</td>
                  <td className="ps-comps">{r.row.niche}</td>
                  <td className="ps-comps">{r.row.email || "—"}</td>
                  <td>
                    {r.status === "queued" && "…"}
                    {r.status === "running" && <span className="ps-running">scanning</span>}
                    {r.status === "done" && <span className="ps-yes">✓</span>}
                    {r.status === "error" && (
                      <span className="ps-no" title={r.error}>
                        error
                      </span>
                    )}
                    {r.status === "skipped" && (
                      <span title={r.error} className="ps-comps">
                        skipped
                      </span>
                    )}
                  </td>
                  <td>
                    {r.scan
                      ? `${r.scan.mentionedCount}/${r.scan.totalPrompts}${r.scan.cached ? " (cached)" : ""}`
                      : r.status === "error"
                        ? r.error?.slice(0, 60)
                        : ""}
                  </td>
                </tr>
                {expanded === i && r.scan && (
                  <tr>
                    <td colSpan={6}>
                      <ScanResult scan={r.scan} prospectEmail={r.row.email || null} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
