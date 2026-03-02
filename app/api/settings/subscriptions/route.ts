/**
 * Global Pulse — Coach subscription settings (Task 5.9)
 * GET: current coach's subscriptions (or admin: all coaches)
 * PUT: update coach's subscriptions (admin can override any coach)
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";
import { PRIORITY_COUNTRIES } from "@/lib/constants";
import { loadRoster } from "@/lib/roster-loader";
import type { CoachEventType, SeverityLevel } from "@/lib/types";

/** Countries with consultants from roster, or fallback to priority. */
async function getCountriesWithConsultants(): Promise<Array<{ name: string; code: string }>> {
  try {
    const { entries } = await loadRoster({ path: "data/roster.csv" });
    const byCountry = new Map<string, string>();
    for (const e of entries) {
      if (e.country && e.country_code && !byCountry.has(e.country_code)) {
        byCountry.set(e.country_code, e.country);
      }
    }
    const fromRoster = Array.from(byCountry.entries())
      .map(([code, name]) => ({ name, code }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return fromRoster.length > 0 ? fromRoster : [...PRIORITY_COUNTRIES];
  } catch {
    return [...PRIORITY_COUNTRIES];
  }
}

export const dynamic = "force-dynamic";

const EVENT_TYPES: CoachEventType[] = [
  "weather",
  "conflict",
  "political",
  "celebration",
  "infrastructure",
  "public_health",
];
const SEVERITIES: SeverityLevel[] = ["low", "moderate", "high", "critical"];

function parseEventTypes(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val) as unknown;
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetCoachId = searchParams.get("coach_id");

    const countries = await getCountriesWithConsultants();

    if (!isDatabaseConfigured() || !sql) {
      return NextResponse.json({
        subscriptions: [],
        countries,
        eventTypes: EVENT_TYPES,
        severities: SEVERITIES,
      });
    }

    const { rows: coachRows } = await sql`
      SELECT id FROM coaches WHERE email = ${user.email} LIMIT 1
    `;
    const myCoachId = (coachRows[0] as { id: number } | undefined)?.id;
    if (!myCoachId) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    let effectiveCoachId = myCoachId;
    if (user.is_admin && targetCoachId) {
      const tid = parseInt(targetCoachId, 10);
      if (!isNaN(tid)) effectiveCoachId = tid;
    }

    const { rows: subRows } = await sql`
      SELECT id, country_code, event_types, min_severity, is_admin_override
      FROM coach_subscriptions
      WHERE coach_id = ${effectiveCoachId}
      ORDER BY country_code
    `;

    const subscriptions = subRows.map((r) => {
      const row = r as { id: number; country_code: string; event_types: string; min_severity: string; is_admin_override: boolean };
      return {
        id: row.id,
        country_code: row.country_code,
        event_types: parseEventTypes(row.event_types),
        min_severity: (row.min_severity ?? "moderate") as SeverityLevel,
        is_admin_override: row.is_admin_override ?? false,
      };
    });

    const { rows: coachList } = user.is_admin
      ? await sql`SELECT id, name, email FROM coaches ORDER BY name`
      : { rows: [] };

    return NextResponse.json({
      subscriptions,
      countries,
      eventTypes: EVENT_TYPES,
      severities: SEVERITIES,
      coaches: user.is_admin ? coachList : undefined,
      myCoachId,
      viewingCoachId: effectiveCoachId,
      isAdmin: user.is_admin,
    });
  } catch (err) {
    console.error("Subscriptions GET error:", err);
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetCoachId = body.coach_id as number | undefined;
    const subscriptions = body.subscriptions as Array<{
      country_code: string;
      event_types: string[];
      min_severity: string;
      is_admin_override?: boolean;
    }> | undefined;

    if (!Array.isArray(subscriptions)) {
      return NextResponse.json(
        { error: "subscriptions must be an array" },
        { status: 400 }
      );
    }

    if (!isDatabaseConfigured() || !sql) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const { rows: coachRows } = await sql`
      SELECT id FROM coaches WHERE email = ${user.email} LIMIT 1
    `;
    const myCoachId = (coachRows[0] as { id: number } | undefined)?.id;
    if (!myCoachId) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    let effectiveCoachId = myCoachId;
    const isAdminOverride = user.is_admin && targetCoachId && targetCoachId !== myCoachId;
    if (isAdminOverride) {
      effectiveCoachId = targetCoachId;
    }

    for (const sub of subscriptions) {
      const countryCode = String(sub?.country_code ?? "").toUpperCase().slice(0, 2);
      if (!countryCode) continue;
      const eventTypes = Array.isArray(sub.event_types)
        ? sub.event_types.filter((t) => EVENT_TYPES.includes(t as CoachEventType))
        : ["weather", "political"];
      const minSeverity = SEVERITIES.includes((sub.min_severity ?? "moderate") as SeverityLevel)
        ? (sub.min_severity as SeverityLevel)
        : "moderate";
      const adminOverride = isAdminOverride ? true : (sub.is_admin_override ?? false);

      await sql`
        INSERT INTO coach_subscriptions (coach_id, country_code, event_types, min_severity, is_admin_override)
        VALUES (${effectiveCoachId}, ${countryCode}, ${JSON.stringify(eventTypes)}, ${minSeverity}, ${adminOverride})
        ON CONFLICT (coach_id, country_code) DO UPDATE SET
          event_types = EXCLUDED.event_types,
          min_severity = EXCLUDED.min_severity,
          is_admin_override = EXCLUDED.is_admin_override
      `;
    }

    const toKeep = new Set(subscriptions.map((s) => String(s?.country_code ?? "").toUpperCase().slice(0, 2)));
    const { rows: existing } = await sql`
      SELECT country_code FROM coach_subscriptions WHERE coach_id = ${effectiveCoachId}
    `;
    for (const r of existing) {
      const cc = (r as { country_code: string }).country_code;
      if (!toKeep.has(cc)) {
        await sql`
          DELETE FROM coach_subscriptions
          WHERE coach_id = ${effectiveCoachId} AND country_code = ${cc}
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Subscriptions PUT error:", err);
    return NextResponse.json({ error: "Failed to save subscriptions" }, { status: 500 });
  }
}
