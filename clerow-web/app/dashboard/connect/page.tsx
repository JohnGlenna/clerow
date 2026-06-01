import "../learn.css";
import { LearnDashboard } from "@/components/dashboard/learn/LearnDashboard";

// The Clerow MCP "Connect" screen, inside the dashboard chrome (same nav, theme
// and shell as the rest of the dashboard) — deep-linkable at /dashboard/connect.
export default function ConnectDashboardPage() {
  return <LearnDashboard initialPage="connect" />;
}
