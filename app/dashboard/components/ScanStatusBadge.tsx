/**
 * Global Pulse — ScanStatusBadge (Task 6.6)
 * Shows "Last scan: X minutes ago" with colored dot:
 * - Green: < 5 hours
 * - Yellow: 5–8 hours
 * - Red: > 8 hours
 */

"use client";

import { useEffect, useState } from "react";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getDotColor(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < FIVE_HOURS_MS) return "#4ADE80";
  if (diff < EIGHT_HOURS_MS) return "#EBFF00";
  return "#EF4444";
}

export function ScanStatusBadge() {
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scan/last")
      .then((r) => r.json())
      .then((data) => setLastScanAt(data.last_scan_at ?? null))
      .catch(() => {});
  }, []);

  if (!lastScanAt) {
    return (
      <span className="text-xs text-brand-medium-gray-violet">
        Last scan: —
      </span>
    );
  }

  const color = getDotColor(lastScanAt);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-brand-charcoal-violet">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      Last scan: {formatAgo(lastScanAt)}
    </span>
  );
}
