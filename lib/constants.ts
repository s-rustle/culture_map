/**
 * Global Pulse — Shared constants
 * Spec: Global_Pulse_Spec_v2.md
 */

/** 19 priority countries for proactive monitoring (4-hour scans). */
export const PRIORITY_COUNTRIES: ReadonlyArray<{ name: string; code: string }> = [
  { name: "Argentina", code: "AR" },
  { name: "Brazil", code: "BR" },
  { name: "Canada", code: "CA" },
  { name: "Colombia", code: "CO" },
  { name: "Costa Rica", code: "CR" },
  { name: "Ecuador", code: "EC" },
  { name: "El Salvador", code: "SV" },
  { name: "Ireland", code: "IE" },
  { name: "Italy", code: "IT" },
  { name: "Mexico", code: "MX" },
  { name: "Netherlands", code: "NL" },
  { name: "Peru", code: "PE" },
  { name: "Poland", code: "PL" },
  { name: "Portugal", code: "PT" },
  { name: "South Africa", code: "ZA" },
  { name: "Spain", code: "ES" },
  { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" },
  { name: "Uruguay", code: "UY" },
];
