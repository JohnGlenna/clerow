// Tiny presentational helpers shared by the admin metrics pages (server-safe).

export function Kpi({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="adm-kpi">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
      {sub ? <div className="s">{sub}</div> : null}
    </div>
  );
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "—";

export const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
