"use client";

/**
 * Global Pulse — AppShell layout (Amendment 1)
 *
 * Sidebar: Dashboard, Briefing, Notifications, Ask, Settings
 * Admin users see "Admin" nav item.
 * Dark sidebar (#020023), light content area (#F7F6FE).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/briefing", label: "Briefing" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/ask", label: "Ask" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — dark #020023 */}
      <aside
        className="w-56 flex flex-col shrink-0"
        style={{ backgroundColor: "#020023" }}
      >
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-semibold text-white">Global Pulse</h1>
        </div>
        <nav className="p-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {user.is_admin && (
            <Link
              href="/dashboard/admin"
              className={`px-3 py-2.5 rounded text-sm font-medium transition-colors mt-2 border-t border-white/10 pt-4 ${
                pathname === "/dashboard/admin"
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="mt-auto p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/60">
            {user.name}
            {user.is_admin && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-brand-accent/80 text-white">
                Admin
              </span>
            )}
          </div>
          <form action="/api/auth/logout" method="POST" className="mt-2">
            <button
              type="submit"
              className="px-3 py-2 text-xs text-white/60 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content — light #F7F6FE */}
      <main
        className="flex-1 overflow-auto"
        style={{ backgroundColor: "#F7F6FE" }}
      >
        {children}
      </main>
    </div>
  );
}
