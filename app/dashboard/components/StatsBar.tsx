"use client";

/**
 * Global Pulse — StatsBar (Phase 3.2)
 * Top-of-dashboard metrics: countries, active situations, consultants affected, last scan.
 */

import { Globe, AlertTriangle, Users, Clock } from "lucide-react";

export interface DashboardStats {
  countries_monitored: number;
  active_situations: number;
  consultants_affected: number;
  last_scan_at: string | null;
  is_admin?: boolean;
}

function formatLastScan(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface StatsBarProps {
  stats: DashboardStats;
  loading?: boolean;
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-brand-light-gray-violet bg-white p-4 flex flex-col items-center justify-center min-h-[80px] animate-pulse"
          >
            <div className="h-4 w-24 bg-brand-pale-lavender rounded mb-2" />
            <div className="h-8 w-16 bg-brand-light-gray-violet rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Countries monitored",
      value: stats.countries_monitored,
      icon: Globe,
    },
    {
      label: "Active situations",
      value: stats.active_situations,
      icon: AlertTriangle,
    },
    {
      label: "Consultants in affected areas",
      value: stats.consultants_affected,
      icon: Users,
    },
    {
      label: "Last scan",
      value: formatLastScan(stats.last_scan_at),
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-lg border border-brand-light-gray-violet bg-white p-4 flex flex-col items-center justify-center text-center min-h-[80px]"
        >
          <div className="flex items-center justify-center gap-2 text-brand-charcoal-violet text-sm mb-1">
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </div>
          <div className="text-xl font-semibold text-brand-dark-bg">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        </div>
      ))}
    </div>
  );
}
