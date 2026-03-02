/**
 * Global Pulse — Dashboard stats API (Phase 3.2)
 *
 * GET /api/dashboard/stats
 * Returns: countries_monitored, active_situations, consultants_affected, last_scan_at
 * Coaches: counts filtered to subscribed countries only.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";
import { loadRoster } from "@/lib/roster-loader";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats: {
    countries_monitored: number;
    active_situations: number;
    consultants_affected: number;
    last_scan_at: string | null;
    is_admin?: boolean;
  } = {
    countries_monitored: 0,
    active_situations: 0,
    consultants_affected: 0,
    last_scan_at: null,
    is_admin: user.is_admin,
  };

  try {
    const rosterResult = await loadRoster();
    stats.countries_monitored = new Set(rosterResult.entries.map((e) => e.country_code)).size;
  } catch (err) {
    console.warn("Roster load failed (stats):", (err as Error).message);
  }

  let allowedCountryCodes: string[] | null = null;
  if (!user.is_admin && isDatabaseConfigured() && sql) {
    try {
      const { rows } = await sql`SELECT c.id FROM coaches c WHERE c.email = ${user.email}`;
      const coachRow = rows[0] as { id: number } | undefined;
      if (coachRow) {
        const { rows: subs } = await sql`
          SELECT country_code FROM coach_subscriptions WHERE coach_id = ${coachRow.id}
        `;
        allowedCountryCodes = subs.map((r) => (r as { country_code: string }).country_code);
      }
    } catch {
      /* coaches table may not exist yet */
    }
  }

  if (isDatabaseConfigured() && sql) {
    try {
      const { rows: situationRows } = await sql`
        SELECT affected_consultant_count, country_code
        FROM situations
        WHERE status = 'active'
      `;
      const filtered = allowedCountryCodes?.length
        ? situationRows.filter((r) =>
            allowedCountryCodes!.includes((r as { country_code: string }).country_code)
          )
        : situationRows;
      stats.active_situations = filtered.length;
      stats.consultants_affected = filtered.reduce(
        (sum: number, r) => sum + Number((r as { affected_consultant_count: number }).affected_consultant_count ?? 0),
        0
      );

      const { rows: scanRows } = await sql`
        SELECT created_at FROM scan_history ORDER BY created_at DESC LIMIT 1
      `;
      const lastScan = scanRows[0] as { created_at: string } | undefined;
      if (lastScan?.created_at) stats.last_scan_at = lastScan.created_at;
    } catch (err) {
      console.warn("DB query failed (stats):", (err as Error).message);
    }
  }

  return NextResponse.json(stats);
}
