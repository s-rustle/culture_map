/**
 * Global Pulse — Brand color constants (Phase 3.1)
 * Spec: Global_Pulse_Spec_v2.md — Lumenalta Brand Standards
 */

/** Severity level for situations */
export type SeverityKey = "low" | "moderate" | "high" | "critical";

/** Brand palette — matches globals.css */
export const brand = {
  lightBg: "#F7F6FE",
  darkBg: "#020023",
  accent: "#7357FF",
  /** Slightly lighter accent for hover states (derived from accent) */
  accentHover: "#8B72FF",
  highImpact: "#EBFF00",
  violet: "#AD39FF",
  magenta: "#E82DE8",
  darkIndigo: "#282859",
  paleLavender: "#ECEAF8",
  lightGrayViolet: "#DCDAED",
  mediumGrayViolet: "#A1A1C6",
  charcoalViolet: "#57576B",
  /** Text on accent/dark backgrounds (white) */
  textOnAccent: "#FFFFFF",
} as const;

/**
 * Severity ↔ Lumenalta Brand Color Mapping (spec: Global_Pulse_Spec_v2.md)
 * ONLY colors from the Lumenalta Brand Standards Guide.
 * 🟢 Low | 🟡 Moderate | 🟠 High | 🔴 Critical
 */
export const severityColors: Record<
  SeverityKey,
  { bg: string; text: string; border?: string; dot: string }
> = {
  low: {
    bg: brand.paleLavender,
    text: brand.darkIndigo,
    border: brand.lightGrayViolet,
    dot: "#4ADE80",
  },
  moderate: {
    bg: "rgba(235, 255, 0, 0.4)",
    text: brand.darkIndigo,
    border: brand.accent,
    dot: brand.highImpact,
  },
  high: {
    bg: brand.paleLavender,
    text: brand.darkIndigo,
    border: brand.violet,
    dot: brand.violet,
  },
  critical: {
    bg: brand.darkBg,
    text: brand.highImpact,
    border: brand.highImpact,
    dot: brand.highImpact,
  },
};

/** Unicode severity indicators */
export const severityIndicators: Record<SeverityKey, string> = {
  low: "🟢",
  moderate: "🟡",
  high: "🟠",
  critical: "🔴",
};

/** Human-readable severity labels */
export const severityLabels: Record<SeverityKey, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};
