"use client";

/**
 * Global Pulse — SeverityBadge (Phase 3.1)
 * Renders 🟢🟡🟠🔴 with brand colors. Reusable across dashboard.
 * Accepts severity as lowercase (low, moderate, high, critical) from DB/API.
 */

import {
  severityColors,
  severityIndicators,
  severityLabels,
  type SeverityKey,
} from "@/lib/colors";

const VALID_KEYS: SeverityKey[] = ["low", "moderate", "high", "critical"];

function normalizeSeverity(severity: unknown): SeverityKey {
  const s = String(severity ?? "").toLowerCase().trim();
  return VALID_KEYS.includes(s as SeverityKey) ? (s as SeverityKey) : "low";
}

interface SeverityBadgeProps {
  severity: unknown;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SeverityBadge({
  severity,
  showLabel = true,
  size = "md",
  className = "",
}: SeverityBadgeProps) {
  const key = normalizeSeverity(severity);
  const colors = severityColors[key];
  const indicator = severityIndicators[key];
  const label = severityLabels[key];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 shrink-0",
    md: "text-sm px-2.5 py-1 shrink-0",
    lg: "text-base px-3 py-1.5 shrink-0",
  };

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium border ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border ?? colors.dot,
      }}
      title={label}
    >
      <span aria-hidden>{indicator}</span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}
