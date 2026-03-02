/**
 * Global Pulse — Lumenalta Brand Color Tokens
 * From Lumenalta Brand Standards Guide (January 2024)
 */

// =============================================================================
// PRIMARY PALETTE (dominant — backgrounds and text)
// =============================================================================

export const primary = {
  lightBackground: "#F7F6FE",
  darkBackground: "#020023",
} as const;

// =============================================================================
// SECONDARY PALETTE (strategic — draw the eye, highlight key info)
// =============================================================================

export const secondary = {
  /** Purple — buttons, links, active states, focus rings */
  accent: "#7357FF",
  /** Yellow-green — critical alerts, primary CTAs, urgent badges */
  highImpact: "#EBFF00",
  /** Violet — high severity highlights */
  violet: "#AD39FF",
  /** Magenta — sparingly, data viz differentiation only */
  magenta: "#E82DE8",
} as const;

// =============================================================================
// TERTIARY PALETTE (supporting — visual depth)
// =============================================================================

export const tertiary = {
  /** Dark mode cards, elevated surfaces */
  darkIndigo: "#282859",
  /** Hover states, subtle backgrounds */
  paleLavender: "#ECEAF8",
  /** Borders, dividers, inactive elements */
  lightGrayViolet: "#DCDAED",
  /** Secondary text, timestamps, metadata */
  mediumGrayViolet: "#A1A1C6",
  /** Tertiary labels on light backgrounds */
  charcoalViolet: "#57576B",
} as const;

// =============================================================================
// SEVERITY ↔ BRAND COLOR MAPPING
// =============================================================================

export const severityColors = {
  /** Low — muted green, harmonizes with brand palette */
  low: "#4ADE80",
  /** Moderate — 40% opacity or muted variant on light BG */
  moderate: "#EBFF00",
  moderateOpacity: "rgba(235, 255, 0, 0.4)",
  /** High — violet with warm amber accent */
  high: "#AD39FF",
  highAccent: "#F59E0B",
  /** Critical — maximum brand contrast */
  critical: "#EBFF00",
  criticalBackground: "#020023",
} as const;

/** Severity level keys for type-safe lookups */
export type SeverityKey = "low" | "moderate" | "high" | "critical";

/**
 * Get the primary display color for a severity level.
 * Use for badges, text, and indicators.
 */
export function getSeverityColor(level: SeverityKey): string {
  return severityColors[level];
}

/**
 * Get severity styling for critical level (text on dark background).
 */
export function getSeverityStyles(level: SeverityKey): {
  color: string;
  backgroundColor?: string;
} {
  switch (level) {
    case "critical":
      return {
        color: severityColors.critical,
        backgroundColor: severityColors.criticalBackground,
      };
    case "moderate":
      return {
        color: severityColors.moderate,
        // Or use opacity variant: severityColors.moderateOpacity
      };
    default:
      return { color: severityColors[level] };
  }
}
