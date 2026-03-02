/**
 * Seed API — One-time populate situations + scan_history for empty dashboard.
 * POST /api/seed — Auth: logged-in admin, or Authorization: Bearer <CRON_SECRET>
 * Idempotent: skips if situations already exist.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

const SEED_SITUATIONS = [
  {
    country_code: "BR",
    country: "Brazil",
    region: "Pernambuco",
    city: "Recife",
    event_type: "weather",
    severity: "high",
    title: "Heavy flooding in Recife — roads impassable",
    summary: "Persistent heavy rainfall has caused significant flooding across Recife. Major roads impassable. Power and internet disruptions reported.",
    source_url: null as string | null,
    source_name: "Weather monitoring",
    infrastructure_impact: "Power, internet, and transport likely affected.",
    affected_consultant_count: 12,
    status: "active",
  },
  {
    country_code: "BR",
    country: "Brazil",
    region: null,
    city: null,
    event_type: "celebration",
    severity: "moderate",
    title: "Carnival season — major cities effectively shut down",
    summary: "Brazil Carnival ongoing. Rio, São Paulo, Salvador experiencing road closures, overwhelmed transport. Cities at reduced capacity 4-7 days.",
    source_url: null as string | null,
    source_name: "Known events",
    infrastructure_impact: "Transport disrupted; many businesses closed.",
    affected_consultant_count: 87,
    status: "active",
  },
  {
    country_code: "AR",
    country: "Argentina",
    region: "Buenos Aires",
    city: "Buenos Aires",
    event_type: "political",
    severity: "moderate",
    title: "Political protests in Buenos Aires — transport delays",
    summary: "Large-scale protests in central Buenos Aires. Road closures and transport reroutes. Commute times significantly increased.",
    source_url: null as string | null,
    source_name: "News monitoring",
    infrastructure_impact: "Transport delays in affected areas.",
    affected_consultant_count: 24,
    status: "active",
  },
  {
    country_code: "CO",
    country: "Colombia",
    region: "Bogotá",
    city: "Bogotá",
    event_type: "public_health",
    severity: "critical",
    title: "Civil unrest — avoid non-essential travel",
    summary: "Widespread civil unrest. Nationwide state of emergency. Curfews in place. Avoid non-essential travel.",
    source_url: null as string | null,
    source_name: "News monitoring",
    infrastructure_impact: "Transport severely disrupted; some communications affected.",
    affected_consultant_count: 45,
    status: "active",
  },
  {
    country_code: "ZA",
    country: "South Africa",
    region: "Gauteng",
    city: "Johannesburg",
    event_type: "infrastructure",
    severity: "low",
    title: "Planned power maintenance — scheduled load-shedding",
    summary: "Eskom planned maintenance. Scheduled load-shedding in Johannesburg. Two-hour blocks during off-peak hours.",
    source_url: null as string | null,
    source_name: "Infrastructure alerts",
    infrastructure_impact: "Power interruptions during scheduled windows.",
    affected_consultant_count: 8,
    status: "active",
  },
];

export async function POST(request: Request) {
  // Allow: (1) logged-in admin, or (2) CRON_SECRET in header/query
  const user = await getSession();
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const bearerMatch = secret && authHeader?.startsWith("Bearer ") && authHeader.slice(7) === secret;
  const querySecret = secret && new URL(request.url).searchParams.get("secret") === secret;

  if (!user?.is_admin && !bearerMatch && !querySecret) {
    return NextResponse.json({ error: "Unauthorized: admin or CRON_SECRET required" }, { status: 401 });
  }

  if (!isDatabaseConfigured() || !sql) {
    return NextResponse.json(
      { error: "Database not configured. Set DATABASE_URL_POOLED in Vercel." },
      { status: 503 }
    );
  }

  try {
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as n FROM situations
    `;
    const n = Number((countRows[0] as { n: string })?.n ?? 0);
    if (n > 0) {
      return NextResponse.json({
        message: "Situations already present",
        count: n,
        skipped: true,
      });
    }

    for (const s of SEED_SITUATIONS) {
      await sql`
        INSERT INTO situations (
          country_code, country, region, city, event_type, severity,
          title, summary, source_url, source_name, infrastructure_impact,
          affected_consultant_count, status, first_detected_at, last_checked_at
        ) VALUES (
          ${s.country_code}, ${s.country}, ${s.region}, ${s.city}, ${s.event_type}, ${s.severity},
          ${s.title}, ${s.summary}, ${s.source_url}, ${s.source_name}, ${s.infrastructure_impact},
          ${s.affected_consultant_count}, ${s.status}, NOW(), NOW()
        )
      `;
    }

    await sql`
      INSERT INTO scan_history (scan_type, countries_scanned, situations_found, duration_ms)
      VALUES ('seed', 'BR,AR,CO,ZA', ${SEED_SITUATIONS.length}, 0)
    `;

    return NextResponse.json({
      message: `Seeded ${SEED_SITUATIONS.length} situations and scan_history`,
      count: SEED_SITUATIONS.length,
    });
  } catch (err) {
    console.error("Seed API error:", err);
    return NextResponse.json(
      { error: "Seed failed", details: (err as Error).message },
      { status: 500 }
    );
  }
}
