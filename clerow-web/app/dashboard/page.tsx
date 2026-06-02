import { redirect } from "next/navigation";

// The dashboard root sends users to the Tasks page (the Climb).
export default function DashboardIndexPage() {
  redirect("/dashboard/tasks");
}
