"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/lib/useDashboard";
import { MascotClerow } from "../../Mascot";
import { LDIcon } from "./LDIcon";

// The dashboard sidebar. Each item is a real route; the active item is derived
// from the URL (usePathname) rather than client state.
const NAV: { href: string; icon: string; label: string }[] = [
  { href: "/dashboard/tasks", icon: "learn", label: "Tasks" },
  { href: "/dashboard/prompts", icon: "quest", label: "Prompts" },
  { href: "/dashboard/models", icon: "scan", label: "AI Models" },
  { href: "/dashboard/leaderboard", icon: "board", label: "Leaderboard" },
  { href: "/dashboard/connect", icon: "connect", label: "Connect" },
  { href: "/dashboard/profile", icon: "profile", label: "Profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useDashboard();
  return (
    <nav className="ld-nav">
      <Link href="/dashboard/tasks" className="ld-brand"><MascotClerow size={34} /><span>Clerow</span></Link>
      {NAV.map((it) => {
        const on = pathname === it.href || (it.href === "/dashboard/tasks" && pathname === "/dashboard");
        return (
          <Link key={it.href} href={it.href} className={`ld-navitem ${on ? "on" : ""}`}>
            <span className="ic"><LDIcon name={it.icon} /></span><span>{it.label}</span>
          </Link>
        );
      })}
      {data?.isAdmin && (
        <Link href="/admin/prospect-scan" className="ld-navitem">
          <span className="ic"><LDIcon name="settings" /></span><span>Admin</span>
        </Link>
      )}
      <div className="ld-nav-spacer" />
    </nav>
  );
}
