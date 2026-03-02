/**
 * Global Pulse — Active situations API (Phase 3.4)
 *
 * GET /api/situations/active?country=&severity=&event_type=
 * Returns situations where status = 'active'.
 * Coaches: filtered to subscribed countries only. Admin: all.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";
import type { Situation } from "@/lib/types";

export const dynamic = "force-dynamic";

function rowToSituation(row: Record<string, unknown>): Situation {
  return {
    id: row.id as number,
    country_code: row.country_code as string,
    country: row.country as string,
    region: row.region as string | undefined,
    city: row.city as string | undefined,
    event_type: row.event_type as Situation["event_type"],
    severity: row.severity as Situation["severity"],
    title: row.title as string,
    summary: row.summary as string,
    source_url: row.source_url as string | undefined,
    source_name: row.source_name as string | undefined,
    infrastructure_impact: row.infrastructure_impact as string | undefined,
    affected_consultant_count: Number(row.affected_consultant_count ?? 0),
    status: row.status as Situation["status"],
    first_detected_at: row.first_detected_at as string,
    last_checked_at: row.last_checked_at as string,
    resolved_at: row.resolved_at as string | undefined,
    previous_severity: row.previous_severity as Situation["previous_severity"],
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("country")?.toUpperCase();
  const severity = searchParams.get("severity")?.toLowerCase();
  const eventType = searchParams.get("event_type")?.toLowerCase();

  let situations: Situation[] = [];

  if (isDatabaseConfigured() && sql) {
    let allowedCountryCodes: string[] | null = null;
    if (!user.is_admin) {
      try {
        const { rows } = await sql`SELECT c.id FROM coaches c WHERE c.email = ${user.email}`;
        const coachRow = rows[0] as { id: number } | undefined;
        if (coachRow) {
          const { rows: subs } = await sql`
            SELECT country_code FROM coach_subscriptions WHERE coach_id = ${coachRow.id}
          `;
          allowedCountryCodes = subs.map((r) => (r as { country_code: string }).country_code);
        }
        if (allowedCountryCodes?.length === 0) {
          return NextResponse.json({ situations: [] });
        }
      } catch {
        /* coaches table may not exist */
      }
    }

    try {
      const { rows } = await sql`
        SELECT id, country_code, country, region, city, event_type, severity,
               title, summary, source_url, source_name, infrastructure_impact,
               affected_consultant_count, status, first_detected_at, last_checked_at,
               resolved_at, previous_severity, created_at, updated_at
        FROM situations
        WHERE status = 'active'
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'moderate' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          first_detected_at DESC
      `;

      situations = rows
        .map((r) => rowToSituation(r as Record<string, unknown>))
        .filter((s) => {
          if (allowedCountryCodes && !allowedCountryCodes.includes(s.country_code)) return false;
          if (countryCode && s.country_code !== countryCode) return false;
          if (severity && s.severity !== severity) return false;
          if (eventType && s.event_type !== eventType) return false;
          return true;
        });
    } catch (err) {
      console.warn("Situations query failed:", (err as Error).message);
    }
  }

  return NextResponse.json({ situations });
}
