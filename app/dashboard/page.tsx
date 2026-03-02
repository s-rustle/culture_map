/**
 * Global Pulse — Dashboard (Phase 3.5)
 *
 * StatsBar + SituationList. Fetches from situations table.
 * Coaches: filter to subscribed countries. Admin: all.
 * Auto-refreshes every 5 minutes.
 */

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <DashboardClient />;
}
