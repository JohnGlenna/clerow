"use client";

import React from "react";

// Optional, attached to the full scan: upload site screenshots + a description so
// the vision step sharpens the brand profile (and covers sites Clerow can't crawl).
export function ContextSheet({ onClose }: { onClose: () => void }) {
  const [about, setAbout] = React.useState("");
  const [shots, setShots] = React.useState<{ path: string; url: string | null }[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    const r = await fetch("/api/brand/context").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (r) { setAbout(r.about ?? ""); setShots(r.screenshots ?? []); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      for (const f of list) fd.append("images", f);
      const res = await fetch("/api/brand/context", { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || "Upload failed."); }
      else await load();
    } finally { setBusy(false); }
  };

  const remove = async (path: string) => {
    setBusy(true);
    try { await fetch(`/api/brand/context?path=${encodeURIComponent(path)}`, { method: "DELETE" }); await load(); }
    finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("about", about);
      await fetch("/api/brand/context", { method: "POST", body: fd });
      setSaved(true);
      setTimeout(onClose, 700);
    } finally { setBusy(false); }
  };

  return (
    <div className="share-pop-back" onClick={onClose}>
      <div className="ctx-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="lesson-x upg-x" onClick={onClose}>✕</button>
        <div className="ctx-ic">✨</div>
        <h2>Add business context</h2>
        <p className="ctx-sub">Screenshots of your site plus a few sentences about your business make all 5 models describe you accurately — and it&apos;s how Clerow reads sites it can&apos;t crawl.</p>

        <div
          className={`ctx-drop ${drag ? "on" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }} />
          <span className="ctx-drop-ic">🖼️</span>
          <span className="ctx-drop-t">Drop screenshots or <u>browse</u></span>
          <span className="ctx-drop-h">PNG / JPG / WebP · up to 6 · 6&nbsp;MB each</span>
        </div>

        {shots.length > 0 && (
          <div className="ctx-thumbs">
            {shots.map((s) => (
              <div key={s.path} className="ctx-thumb" style={{ backgroundImage: s.url ? `url(${s.url})` : undefined }}>
                <button className="ctx-thumb-x" onClick={() => remove(s.path)} disabled={busy}>✕</button>
              </div>
            ))}
          </div>
        )}

        <textarea className="ctx-about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)}
          placeholder="What do you do, who's it for, and what makes you different? e.g. 'PR agency for B2B SaaS expanding into the US — known for landing tier-1 press in 60 days.'" />

        <button className="btn-upg btn-upg--lg" disabled={busy} onClick={save}>
          {saved ? "Saved ✓" : busy ? "…" : "Save context"}
        </button>
        <p className="ctx-foot">Applied on your next full scan across all 5 models.</p>
      </div>
    </div>
  );
}
