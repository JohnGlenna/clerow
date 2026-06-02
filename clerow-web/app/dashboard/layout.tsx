"use client";

import "./dashboard.css";
import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/useDashboard";
import { OverlayProvider } from "@/components/dashboard/shell/OverlayProvider";
import { Sidebar } from "@/components/dashboard/shell/Sidebar";
import { TopBar } from "@/components/dashboard/shell/TopBar";
import { RightRail } from "@/components/dashboard/shell/RightRail";

// The dashboard shell: one DashboardProvider (single data fetch, persisted across
// route changes), the modal layer (OverlayProvider), the sidebar, the sticky top
// bar, and — on the Tasks page only — the right rail. Each page renders into the
// center column via {children}.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <OverlayProvider>
        <Shell>{children}</Shell>
      </OverlayProvider>
    </DashboardProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useDashboard();
  const isTasks = pathname === "/dashboard/tasks" || pathname === "/dashboard";
  return (
    <div className="ld-root">
      <div className={`ld-shell ${isTasks ? "" : "ld-shell--norail"}`}>
        <Sidebar />
        <div className="ld-center">
          {data && <TopBar data={data} />}
          {children}
        </div>
        {isTasks && data && <RightRail data={data} />}
      </div>
    </div>
  );
}
