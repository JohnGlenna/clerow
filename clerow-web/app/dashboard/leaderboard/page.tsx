import { AppShell } from "@/components/dashboard/AppShell";
import { PageLeaderboard } from "@/components/dashboard/PageLeaderboard";

export default function LeaderboardPage() {
  return (
    <AppShell page="leaderboard">
      <PageLeaderboard />
    </AppShell>
  );
}
