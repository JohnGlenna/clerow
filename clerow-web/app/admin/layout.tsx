import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/adminGate";

import "../dashboard/dashboard.css";
import "./admin.css";
import { AdminSidebar } from "./AdminSidebar";

// The admin shell: every /admin/* page gets the founder gate and the dedicated
// admin sidebar. API routes still gate themselves — this is just the UI shell.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  return (
    <div className="ld-root">
      <div className="adm-shell">
        <AdminSidebar />
        <main className="adm-main">{children}</main>
      </div>
    </div>
  );
}
