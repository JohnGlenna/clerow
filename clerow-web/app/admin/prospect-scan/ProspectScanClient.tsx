"use client";

// The Prospect Scanner shell: three tabs sharing one prefill channel so the
// Discover tab can hand a lead to the scanner in one click. All panels stay
// mounted — switching tabs never loses batch progress or fetched leads.

import { useState } from "react";

import { BatchTable } from "./BatchTable";
import { DiscoverTab, type ScanHandoff } from "./DiscoverTab";
import { FullReportPanel } from "./FullReportPanel";
import { OutboxTab } from "./OutboxTab";
import { SingleScanPanel, type ScanPrefill } from "./SingleScanPanel";

type Tab = "single" | "report" | "outbox" | "csv" | "discover";

const TABS: { id: Tab; label: string }[] = [
  { id: "single", label: "Scan" },
  { id: "report", label: "Full report" },
  { id: "outbox", label: "Outbox" },
  { id: "csv", label: "CSV batch" },
  { id: "discover", label: "Discover" },
];

export function ProspectScanClient() {
  const [tab, setTab] = useState<Tab>("single");
  const [prefill, setPrefill] = useState<ScanPrefill | null>(null);

  const handoff = (h: ScanHandoff) => {
    setPrefill({
      nonce: (prefill?.nonce ?? 0) + 1,
      brand: h.brand,
      website: h.website,
      category: h.category,
      email: h.email,
      scanId: h.scanId,
    });
    setTab("single");
  };

  return (
    <div className="ps-page">
      <header className="ps-header">
        <h1>Prospect Scanner</h1>
        <p className="ps-sub">
          Internal outreach tool — scans run on ChatGPT (API) only. Answers approximate, but aren&apos;t
          identical to, chatgpt.com.
        </p>
      </header>

      <nav className="ps-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ps-tab ${tab === t.id ? "on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div style={{ display: tab === "single" ? "block" : "none" }}>
        <SingleScanPanel prefill={prefill} />
      </div>
      <div style={{ display: tab === "report" ? "block" : "none" }}>
        <FullReportPanel />
      </div>
      <div style={{ display: tab === "outbox" ? "block" : "none" }}>
        <OutboxTab onScan={handoff} />
      </div>
      <div style={{ display: tab === "csv" ? "block" : "none" }}>
        <BatchTable />
      </div>
      <div style={{ display: tab === "discover" ? "block" : "none" }}>
        <DiscoverTab onScan={handoff} />
      </div>
    </div>
  );
}
