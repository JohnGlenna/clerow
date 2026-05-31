/* Clerow iOS — tab bar + simple icon set */

function TabIcon({ name }) {
  const p = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home":   return <svg {...p}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>;
    case "prompts":return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "quests": return <svg {...p}><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M10 14h4v5h-4z"/><path d="M7 21h10"/></svg>;
    case "rank":   return <svg {...p}><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="10"/></svg>;
    case "you":    return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "bell":   return <svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>;
    case "back":   return <svg {...p}><path d="M15 18l-6-6 6-6"/></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.1-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.1-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.1V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.1 2.9H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4.9z"/></svg>;
    case "check":  return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case "arrow":  return <svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case "search": return <svg {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>;
    case "share":  return <svg {...p}><path d="M4 12v8h16v-8"/><polyline points="8 6 12 2 16 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>;
    case "lock":   return <svg {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case "chevron":return <svg {...p}><polyline points="9 6 15 12 9 18"/></svg>;
    default: return null;
  }
}

function TabBar({ active = "home" }) {
  const tabs = [
    { k: "home",    l: "Home" },
    { k: "prompts", l: "Prompts" },
    { k: "quests",  l: "Quests" },
    { k: "rank",    l: "Rank" },
    { k: "you",     l: "You" },
  ];
  return (
    <div className="ia-tabbar">
      {tabs.map(t => (
        <div key={t.k} className={`ia-tab ${active === t.k ? "on" : ""}`}>
          <span className="ia-tab-ico"><TabIcon name={t.k} /></span>
          <span>{t.l}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { TabIcon, TabBar });
