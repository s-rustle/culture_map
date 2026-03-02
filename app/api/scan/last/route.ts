/**
 * Global Pulse — Last scan time (Task 6.6)
 * GET /api/scan/last — Returns last_scan_at for ScanStatusBadge.
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

    let lastScanAt: string | null = null;
    if (isDatabaseConfigured() && sql) {
      const { rows } = await sql`
        SELECT created_at FROM scan_history ORDER BY created_at DESC LIMIT 1
      `;
      const row = rows[0] as { created_at: string } | undefined;
      if (row?.created_at) lastScanAt = row.created_at;
    }

    return NextResponse.json({ last_scan_at: lastScanAt });
  } catch (err) {
    console.error("Scan last error:", err);
    return NextResponse.json(
      { error: "Failed to load scan status" },
      { status: 500 }
    );
  }
}
