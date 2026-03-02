/**
 * Ingest API — Load real situations from data/known-events.json + roster
 * POST /api/seed — Auth: logged-in admin, or Authorization: Bearer <CRON_SECRET>
 * Replaces previous known-events situations, inserts from your real data.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ingestKnownEvents } from "@/lib/ingest-known-events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSession();
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const bearerMatch = secret && authHeader?.startsWith("Bearer ") && authHeader.slice(7) === secret;
  const querySecret = secret && new URL(request.url).searchParams.get("secret") === secret;

  if (!user?.is_admin && !bearerMatch && !querySecret) {
    return NextResponse.json({ error: "Unauthorized: admin or CRON_SECRET required" }, { status: 401 });
  }

  const { inserted, error } = await ingestKnownEvents();

  if (error) {
    return NextResponse.json(
      { error: error === "Database not configured" ? "Database not configured. Set DATABASE_URL in Vercel." : error },
      { status: error === "Database not configured" ? 503 : 500 }
    );
  }

  return NextResponse.json({
    message: `Loaded ${inserted} situations from known-events.json (filtered by roster + priority countries)`,
    count: inserted,
  });
}
