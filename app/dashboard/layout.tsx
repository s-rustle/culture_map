/**
 * Global Pulse — Dashboard layout
 *
 * Wraps all /dashboard routes with AppShell. Requires auth.
 */

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
