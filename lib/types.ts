/**
 * Global Pulse — TypeScript interfaces
 * Spec: Global_Pulse_Spec_v2.md + Global_Pulse_Amendment_1.md
 */

// =============================================================================
// SEVERITY
// =============================================================================

/** Severity levels: 🟢 Low | 🟡 Moderate | 🟠 High | 🔴 Critical */
export type SeverityLevel = "low" | "moderate" | "high" | "critical";

// =============================================================================
// ROSTER ENTRY (Amendment 1: 2-column CSV — city, country)
// =============================================================================

/**
 * Roster record: location only. No PII.
 * country_code, timezone, latitude, longitude are auto-derived from city + country.
 */
export interface RosterEntry {
  /** City or region name (from CSV) */
  city: string;
  /** Country name (from CSV) */
  country: string;
  /** ISO 3166-1 alpha-2 (auto-derived) */
  country_code: string;
  /** IANA timezone (auto-derived) */
  timezone: string;
  /** City-level latitude (auto-derived) */
  latitude: number;
  /** City-level longitude (auto-derived) */
  longitude: number;
}

/** Legacy alias — use RosterEntry. Kept for compatibility during migration. */
export type Consultant = RosterEntry;

// =============================================================================
// COACH (Amendment 1: is_admin, subscriptions)
// =============================================================================

export interface Coach {
  id: number;
  name: string;
  email: string;
  timezone: string;
  is_admin: boolean;
}

/** Event types coaches can subscribe to (Amendment 1) */
export type CoachEventType =
  | "weather"
  | "conflict"
  | "political"
  | "celebration"
  | "infrastructure"
  | "public_health";

export interface CoachSubscription {
  id: number;
  coach_id: number;
  country_code: string;
  event_types: CoachEventType[];
  min_severity: SeverityLevel;
  is_admin_override: boolean;
}

// =============================================================================
// SITUATION (Database + Tool 2/3 output)
// =============================================================================

export type SituationEventType =
  | "weather"
  | "political"
  | "conflict"
  | "celebration"
  | "infrastructure"
  | "public_health"
  | "economic"
  | "environmental";

export type SituationStatus = "active" | "monitoring" | "resolved";

export interface Situation {
  id: number;
  country_code: string;
  country: string;
  region?: string;
  city?: string;
  event_type: SituationEventType;
  severity: SeverityLevel;
  title: string;
  summary: string;
  source_url?: string;
  source_name?: string;
  infrastructure_impact?: string;
  affected_consultant_count: number;
  status: SituationStatus;
  first_detected_at: string;
  last_checked_at: string;
  resolved_at?: string;
  previous_severity?: SeverityLevel;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// NOTIFICATION (Amendment 1: coaches only, coach_id)
// =============================================================================

export type NotificationEmailType = "alert" | "escalation" | "briefing" | "all_clear";

export type NotificationStatus =
  | "draft"
  | "approved"
  | "sent"
  | "dismissed"
  | "failed";

export interface Notification {
  id: number;
  situation_id?: number;
  coach_id: number;
  email_type: NotificationEmailType;
  subject: string;
  body_html: string;
  screenshot_url?: string;
  status: NotificationStatus;
  approved_by?: number; // coach_id of admin who approved
  approved_at?: string;
  sent_at?: string;
  created_at?: string;
}

// =============================================================================
// SCAN RESULT
// =============================================================================

export type ScanType =
  | "scheduled_4hr"
  | "daily_briefing"
  | "manual"
  | "escalation_recheck";

export interface ScanResult {
  id: number;
  scan_type: ScanType;
  countries_scanned: string;
  situations_found: number;
  escalations_found: number;
  duration_ms?: number;
  created_at?: string;
}

// =============================================================================
// SESSION / AUTH (Amendment 1: role-aware)
// =============================================================================

export interface SessionUser {
  coach_id: number;
  email: string;
  name: string;
  is_admin: boolean;
}

// =============================================================================
// KNOWN EVENT
// =============================================================================

export interface KnownEvent {
  id?: string;
  title: string;
  /** Agent-written summary (alias: summary) */
  description?: string;
  summary?: string;
  event_type: SituationEventType;
  /** ISO country codes affected (alias: country_codes) */
  countries_affected?: string[];
  country_code?: string;
  country?: string;
  region?: string;
  country_codes?: string[];
  severity: SeverityLevel;
  start_date?: string;
  end_date?: string;
  recurrence?: string;
  source_url?: string;
  source_name?: string;
  infrastructure_impact?: string;
  relevance_assessment?: string;
  last_updated?: string;
  created_at?: string;
}
