"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MascotClerow } from "@/components/Mascot";
import { LDIcon } from "@/components/dashboard/shell/LDIcon";

const NAV: { href: string; icon: string; label: string }[] = [
  { href: "/admin/metrics", icon: "board", label: "Metrics" },
  { href: "/admin/activity", icon: "quest", label: "Activity" },
  { href: "/admin/mcp", icon: "connect", label: "MCP Usage" },
  { href: "/admin/investors", icon: "profile", label: "Investors" },
  { href: "/admin/prospect-scan", icon: "scan", label: "Prospect Scanner" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="ld-nav adm-nav">
      <Link href="/admin/prospect-scan" className="ld-brand">
        <MascotClerow size={34} />
        <span>
          Clerow <em className="adm-tag">admin</em>
        </span>
      </Link>
      {NAV.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`ld-navitem ${pathname.startsWith(it.href) ? "on" : ""}`}
        >
          <span className="ic">
            <LDIcon name={it.icon} />
          </span>
          <span>{it.label}</span>
        </Link>
      ))}
      <div className="ld-nav-spacer" />
      <Link href="/dashboard" className="ld-navitem">
        <span className="ic">
          <LDIcon name="learn" />
        </span>
        <span>← Dashboard</span>
      </Link>
    </nav>
  );
}
