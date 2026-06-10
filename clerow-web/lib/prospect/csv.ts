// Pure CSV parser for the brreg lead-script export
// (columns: navn,orgnr,website,email,phone,sted,niche,registrert).
// Hand-rolled: quoted fields, "" escapes, CRLF — no dependency.

import type { ProspectCsvRow } from "./types";

const COLUMNS = ["navn", "orgnr", "website", "email", "phone", "sted", "niche", "registrert"] as const;

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseProspectCsv(text: string): { rows: ProspectCsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const raw = parseRows(text);
  if (!raw.length) return { rows: [], errors: ["Empty CSV"] };

  const header = raw[0].map((h) => h.trim().toLowerCase());
  const idx = new Map<string, number>();
  for (const col of COLUMNS) {
    const at = header.indexOf(col);
    if (at >= 0) idx.set(col, at);
  }
  if (!idx.has("navn") || !idx.has("website")) {
    return { rows: [], errors: [`Header must include at least navn and website (got: ${header.join(", ")})`] };
  }

  const rows: ProspectCsvRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i];
    const get = (col: string) => {
      const at = idx.get(col);
      return at === undefined ? "" : (cells[at] ?? "").trim();
    };
    const row: ProspectCsvRow = {
      navn: get("navn"),
      orgnr: get("orgnr"),
      website: get("website"),
      email: get("email"),
      phone: get("phone"),
      sted: get("sted"),
      niche: get("niche"),
      registrert: get("registrert"),
    };
    if (!row.navn) {
      errors.push(`Row ${i + 1}: missing navn — skipped`);
      continue;
    }
    rows.push(row);
  }
  return { rows, errors };
}
