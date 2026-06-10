"use client";

// Discover tab: find prospects from Brønnøysund / Product Hunt / Show HN —
// one source sub-tab at a time, infinite scroll instead of paging — persist
// them as leads with a 5-stage status (the entire CRM), and hand any row off
// to the scanner in one click.

import { useCallback, useEffect, useRef, useState } from "react";

import { LEAD_STATUSES, type LeadRow, type LeadStatus, type PageInfo } from "@/lib/leads/types";

import { discover, fetchCounts, patchLeadStatus } from "./api";

export type ScanHandoff = {
  brand: string;
  website: string;
  category?: string;
  email?: string | null;
  scanId?: string | null;
};

const NAERING_PRESETS = [
  { code: "62", label: "62 – IT/SaaS" },
  { code: "73", label: "73 – Marketing/reklame" },
  { code: "70.2", label: "70.2 – Konsulent" },
  { code: "47", label: "47 – Retail/netthandel" },
];

const KRISTIANSAND = "4204";

type Source = "brreg" | "producthunt" | "shownh";

const SOURCE_TABS: { id: Source; label: string }[] = [
  { id: "brreg", label: "Brønnøysund" },
  { id: "producthunt", label: "Product Hunt" },
  { id: "shownh", label: "Show HN" },
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function suggestCategory(lead: LeadRow): string {
  const m = lead.meta as { niche?: string; place?: string; tagline?: string; topics?: string[] };
  if (lead.source === "brreg" && m.niche) return m.place ? `${m.niche} i ${m.place}` : m.niche;
  if (lead.source === "producthunt") return m.topics?.length ? m.topics.join(", ") : m.tagline || "";
  return "";
}

export function DiscoverTab({ onScan }: { onScan: (h: ScanHandoff) => void }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [source, setSource] = useState<Source>("brreg");

  const refreshCounts = useCallback(() => {
    fetchCounts().then(setCounts).catch(() => setCounts(null));
  }, []);

  useEffect(refreshCounts, [refreshCounts]);

  return (
    <div className="ps-discover">
      <div className="lp-card ps-pipeline">
        <span className="ps-pipeline-title">Pipeline</span>
        {LEAD_STATUSES.map((s) => (
          <span key={s} className={`ps-badge ps-badge-${s}`}>
            {s} <b>{counts?.[s] ?? "–"}</b>
          </span>
        ))}
        <span className="ps-comps">total {counts?.total ?? "–"}</span>
      </div>

      <nav className="ps-tabs ps-subtabs">
        {SOURCE_TABS.map((t) => (
          <button
            key={t.id}
            className={`ps-tab ${source === t.id ? "on" : ""}`}
            onClick={() => setSource(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div style={{ display: source === "brreg" ? "block" : "none" }}>
        <BrregPanel onScan={onScan} onChanged={refreshCounts} />
      </div>
      <div style={{ display: source === "producthunt" ? "block" : "none" }}>
        <ProductHuntPanel onScan={onScan} onChanged={refreshCounts} />
      </div>
      <div style={{ display: source === "shownh" ? "block" : "none" }}>
        <ShowHnPanel onScan={onScan} onChanged={refreshCounts} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function usePanelFetch(onChanged: () => void) {
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const run = async (params: URLSearchParams, append = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await discover(params);
      setNotConfigured(!!res.notConfigured);
      setLeads((prev) => (append && prev ? [...prev, ...res.leads] : res.leads));
      setPageInfo(res.page);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return { leads, setLeads, pageInfo, notConfigured, busy, error, run };
}

/** Calls onMore whenever the sentinel scrolls near the viewport. */
function ScrollSentinel({ onMore, active }: { onMore: () => void; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onMore();
      },
      { rootMargin: "500px" },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [onMore, active]);
  if (!active) return null;
  return (
    <div ref={ref} className="ps-sentinel">
      Loading more…
    </div>
  );
}

function BrregPanel({ onScan, onChanged }: { onScan: (h: ScanHandoff) => void; onChanged: () => void }) {
  const [from, setFrom] = useState(daysAgo(60));
  const [to, setTo] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [freeCode, setFreeCode] = useState("");
  const [kommune, setKommune] = useState("");
  const [requireWebsite, setRequireWebsite] = useState(true);
  const pageRef = useRef(0);
  const f = usePanelFetch(onChanged);

  const buildParams = (p: number) => {
    const naering = [...codes, ...(freeCode.trim() ? [freeCode.trim()] : [])].join(",");
    const params = new URLSearchParams({
      source: "brreg",
      from,
      page: String(p),
      requireWebsite: requireWebsite ? "1" : "0",
    });
    if (to) params.set("to", to);
    if (naering) params.set("naering", naering);
    if (kommune.trim()) params.set("kommune", kommune.trim());
    return params;
  };

  const fetchFresh = () => {
    pageRef.current = 0;
    void f.run(buildParams(0));
  };
  const hasMore = !!f.pageInfo && pageRef.current < f.pageInfo.totalPages - 1;
  const loadMore = () => {
    if (f.busy || !hasMore) return;
    pageRef.current += 1;
    void f.run(buildParams(pageRef.current), true);
  };

  return (
    <div className="lp-card ps-panel">
      <h2>Brønnøysund — nyregistrerte selskaper</h2>
      <div className="ps-filters">
        <label>
          Registrert etter
          <input className="ps-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Registrert før (valgfritt)
          <input className="ps-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <span className="ps-chips">
          {NAERING_PRESETS.map((p) => (
            <button
              key={p.code}
              type="button"
              className={`ps-chip ${codes.includes(p.code) ? "on" : ""}`}
              onClick={() =>
                setCodes((cs) => (cs.includes(p.code) ? cs.filter((c) => c !== p.code) : [...cs, p.code]))
              }
            >
              {p.label}
            </button>
          ))}
          <input
            className="ps-input ps-input-sm"
            placeholder="annen kode"
            value={freeCode}
            onChange={(e) => setFreeCode(e.target.value)}
          />
        </span>
        <span className="ps-chips">
          <button
            type="button"
            className={`ps-chip ${kommune === KRISTIANSAND ? "on" : ""}`}
            onClick={() => setKommune(kommune === KRISTIANSAND ? "" : KRISTIANSAND)}
          >
            Kristiansand
          </button>
          <input
            className="ps-input ps-input-sm"
            placeholder="kommunenr"
            value={kommune}
            onChange={(e) => setKommune(e.target.value)}
          />
          <label className="ps-toggle">
            <input
              type="checkbox"
              checked={requireWebsite}
              onChange={(e) => setRequireWebsite(e.target.checked)}
            />
            må ha nettside
          </label>
        </span>
        <button className="ps-btn ps-btn-primary" onClick={fetchFresh} disabled={f.busy}>
          {f.busy ? "Henter…" : "Hent selskaper"}
        </button>
      </div>
      {f.error && <div className="ps-error">{f.error}</div>}
      {f.leads && (
        <>
          <LeadsTable
            leads={f.leads}
            setLeads={f.setLeads}
            onScan={onScan}
            onChanged={onChanged}
            columns={["place", "niche", "registeredAt"]}
          />
          <div className="ps-comps">
            {f.leads.length} rows{f.pageInfo ? ` · page ${pageRef.current + 1}/${f.pageInfo.totalPages}` : ""}
          </div>
          <ScrollSentinel onMore={loadMore} active={hasMore && !f.busy} />
        </>
      )}
    </div>
  );
}

function ProductHuntPanel({ onScan, onChanged }: { onScan: (h: ScanHandoff) => void; onChanged: () => void }) {
  const f = usePanelFetch(onChanged);
  return (
    <div className="lp-card ps-panel">
      <h2>Product Hunt — launches last 7 days</h2>
      <button
        className="ps-btn ps-btn-primary"
        onClick={() => void f.run(new URLSearchParams({ source: "producthunt" }))}
        disabled={f.busy}
      >
        {f.busy ? "Fetching…" : "Fetch launches"}
      </button>
      {f.notConfigured && (
        <div className="ps-hint">
          Set <code>PRODUCTHUNT_API_TOKEN</code> in the env (Developer Token from
          producthunt.com/v2/oauth/applications) to enable this panel.
        </div>
      )}
      {f.error && <div className="ps-error">{f.error}</div>}
      {f.leads && !f.notConfigured && (
        <LeadsTable
          leads={f.leads}
          setLeads={f.setLeads}
          onScan={onScan}
          onChanged={onChanged}
          columns={["tagline", "topics"]}
        />
      )}
    </div>
  );
}

function ShowHnPanel({ onScan, onChanged }: { onScan: (h: ScanHandoff) => void; onChanged: () => void }) {
  const pageRef = useRef(0);
  const f = usePanelFetch(onChanged);

  const fetchFresh = () => {
    pageRef.current = 0;
    void f.run(new URLSearchParams({ source: "shownh", page: "0" }));
  };
  const hasMore = !!f.pageInfo && pageRef.current < f.pageInfo.totalPages - 1;
  const loadMore = () => {
    if (f.busy || !hasMore) return;
    pageRef.current += 1;
    void f.run(new URLSearchParams({ source: "shownh", page: String(pageRef.current) }), true);
  };

  return (
    <div className="lp-card ps-panel">
      <h2>Show HN — latest launches</h2>
      <button className="ps-btn ps-btn-primary" onClick={fetchFresh} disabled={f.busy}>
        {f.busy ? "Fetching…" : "Fetch posts"}
      </button>
      {f.error && <div className="ps-error">{f.error}</div>}
      {f.leads && (
        <>
          <LeadsTable
            leads={f.leads}
            setLeads={f.setLeads}
            onScan={onScan}
            onChanged={onChanged}
            columns={["points", "postedAt"]}
          />
          <div className="ps-comps">{f.leads.length} rows</div>
          <ScrollSentinel onMore={loadMore} active={hasMore && !f.busy} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LeadsTable({
  leads,
  setLeads,
  onScan,
  onChanged,
  columns,
}: {
  leads: LeadRow[];
  setLeads: (update: (ls: LeadRow[] | null) => LeadRow[] | null) => void;
  onScan: (h: ScanHandoff) => void;
  onChanged: () => void;
  columns: string[];
}) {
  const setStatus = async (lead: LeadRow, status: LeadStatus) => {
    if (!lead.id) return;
    const prev = lead.status;
    setLeads((ls) => ls && ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await patchLeadStatus(lead.id, status);
      onChanged();
    } catch {
      setLeads((ls) => ls && ls.map((l) => (l.id === lead.id ? { ...l, status: prev } : l)));
    }
  };

  const metaCell = (lead: LeadRow, col: string): string => {
    const v = (lead.meta as Record<string, unknown>)[col];
    if (v == null) return "—";
    if (Array.isArray(v)) return v.join(", ") || "—";
    if (col === "postedAt" || col === "registeredAt") {
      return String(v).slice(0, 10);
    }
    return String(v);
  };

  if (!leads.length) return <div className="ps-comps">No results.</div>;

  return (
    <table className="ps-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Website</th>
          <th>Contact</th>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {leads.map((lead, i) => (
          <tr key={lead.id ?? `x${i}`}>
            <td>{lead.name}</td>
            <td className="ps-comps">
              {lead.website ? (
                <a
                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {lead.websiteKey ?? lead.website}
                </a>
              ) : (
                "—"
              )}
            </td>
            <td className="ps-comps">{lead.email || lead.phone || "—"}</td>
            {columns.map((c) => (
              <td key={c} className="ps-comps">
                {metaCell(lead, c)}
              </td>
            ))}
            <td>
              {lead.id ? (
                <select
                  className={`ps-badge-select ps-badge-${lead.status}`}
                  value={lead.status}
                  onChange={(e) => void setStatus(lead, e.target.value as LeadStatus)}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="ps-comps">not saved</span>
              )}
            </td>
            <td>
              <button
                className="ps-btn ps-btn-ghost"
                disabled={!lead.website}
                onClick={() =>
                  onScan({
                    brand: lead.name,
                    website: lead.website!,
                    category: suggestCategory(lead),
                    email: lead.email,
                    scanId: lead.scanId,
                  })
                }
              >
                {lead.scanId ? "View scan" : "Scan"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
