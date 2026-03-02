/**
 * Global Pulse — Latest briefing API
 *
 * GET /api/briefing/latest
 * Returns the most recent morning briefing for /dashboard/briefing page.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isDatabaseConfigured() || !sql) {
      return NextResponse.json({
        briefing: null,
        message: "Database not configured",
      });
    }

    const { rows } = await sql`
      SELECT id, created_at, total_active_situations, escalations_24h,
             countries_affected, total_affected_consultants,
             situations_snapshot, summary_text
      FROM briefings
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({
        briefing: null,
        message: "No briefing generated yet. Run the daily briefing cron or check back after 06:00 CT.",
      });
    }

    const countriesAffected = (() => {
      try {
        return JSON.parse((row.countries_affected as string) ?? "[]") as string[];
      } catch {
        return [];
      }
    })();

    return NextResponse.json({
      briefing: {
        id: row.id,
        created_at: row.created_at,
        total_active_situations: Number(row.total_active_situations ?? 0),
        escalations_24h: Number(row.escalations_24h ?? 0),
        countries_affected: countriesAffected,
        total_affected_consultants: Number(row.total_affected_consultants ?? 0),
        situations_snapshot: row.situations_snapshot ?? [],
        summary_text: row.summary_text ?? null,
      },
    });
  } catch (err) {
    console.error("Briefing latest error:", err);
    return NextResponse.json(
      { error: "Failed to load briefing" },
      { status: 500 }
    );
  }
}
