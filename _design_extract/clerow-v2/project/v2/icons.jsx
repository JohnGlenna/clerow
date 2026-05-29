/* Tiny icon set — flat stroke style, 16px default */

function Icon({ name, size = 16, color = "currentColor" }) {
  const props = {
    width: size, height: size,
    viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  switch (name) {
    case "eye":
      return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "target":
      return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill={color}/></svg>;
    case "smile":
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r="0.8" fill={color} stroke="none"/><circle cx="15" cy="10" r="0.8" fill={color} stroke="none"/></svg>;
    case "bolt":
      return <svg {...props}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>;
    case "flame":
      return <svg {...props}><path d="M12 22a7 7 0 0 1-4-12.7c0 3 2 4 2 4s-1-4 2-7c0 4 4 5 4 9a4 4 0 0 1-4 6.7z"/></svg>;
    case "trophy":
      return <svg {...props}><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M10 14h4v4h-4z"/><path d="M7 22h10"/><path d="M12 18v4"/></svg>;
    case "check":
      return <svg {...props}><polyline points="20 6 9 17 4 12"/></svg>;
    case "arrow":
      return <svg {...props}><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>;
    case "plus":
      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "search":
      return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>;
    case "globe":
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    case "tag":
      return <svg {...props}><path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5" fill={color}/></svg>;
    case "download":
      return <svg {...props}><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>;
    case "grid":
      return <svg {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "list":
      return <svg {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case "settings":
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "calendar":
      return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "external":
      return <svg {...props}><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>;
    case "chart":
      return <svg {...props}><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 6-7"/></svg>;
    case "bar":
      return <svg {...props}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
    case "help":
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><circle cx="12" cy="17" r="0.6" fill={color}/></svg>;
    case "spark":
      return <svg {...props}><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/></svg>;
    case "lock":
      return <svg {...props}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case "ai":
      return <svg {...props}><path d="M12 2l2.5 5.5L20 10l-5.5 2.5L12 18l-2.5-5.5L4 10l5.5-2.5z"/></svg>;
    case "x":
      return <svg {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case "home":
      return <svg {...props}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>;
    case "user":
      return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "bell":
      return <svg {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M14 21a2 2 0 0 1-4 0"/></svg>;
    case "users":
      return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1A4 4 0 0 1 16 11"/></svg>;
    case "rocket":
      return <svg {...props}><path d="M5 13l-2 6 6-2"/><path d="M14.5 9.5l-9 9"/><path d="M14 4l6 6-8 8H6v-6z"/></svg>;
    case "feed":
      return <svg {...props}><path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/></svg>;
    default:
      return null;
  }
}

Object.assign(window, { Icon });
