import { redirect } from "next/navigation";

// The connect screen now lives inside the dashboard. Keep this path working for
// any old links/bookmarks by sending them there.
export default function ConnectRedirect() {
  redirect("/dashboard/connect");
}
