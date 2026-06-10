import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/adminGate";

import "../../dashboard/dashboard.css";
import "./prospect-scan.css";
import { ProspectScanClient } from "./ProspectScanClient";

// Founder-only internal tool. Gate here AND in every /api/admin route.
export default async function Page() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  return (
    <div className="ld-root">
      <ProspectScanClient />
    </div>
  );
}
