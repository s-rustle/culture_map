/**
 * Seed situations for dashboard testing (Phase 3 / Task 7.6)
 * Run: npx tsx scripts/seed-situations.ts
 *
 * Inserts 3-5 realistic test situations including 🟠 High and 🟡 Moderate.
 */

import { config } from "dotenv";
import { join } from "node:path";
import { Pool } from "pg";

config({ path: join(process.cwd(), ".env.local") });

const SEED_SITUATIONS = [
  {
    country_code: "BR",
    country: "Brazil",
    region: "Pernambuco",
    city: "Recife",
    event_type: "weather",
    severity: "high",
    title: "Heavy flooding in Recife — roads impassable",
    summary: "Persistent heavy rainfall has caused significant flooding across Recife and surrounding areas. Major roads are impassable. Power and internet disruptions reported in several neighborhoods. Local authorities advise avoiding non-essential travel.",
    source_url: null,
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
    summary: "Brazil Carnival is ongoing. Rio de Janeiro, São Paulo, Salvador, and Recife are experiencing road closures, overwhelmed public transport, and many businesses closed. Cities operate at reduced capacity for 4-7 days.",
    source_url: null,
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
    summary: "Large-scale protests in central Buenos Aires have led to road closures and public transport reroutes. Commute times significantly increased. Protests expected to continue through the week.",
    source_url: null,
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
    summary: "Widespread civil unrest has prompted a nationwide state of emergency. Major cities including Bogotá, Medellín, and Cali are affected. Curfews in place. Authorities advise avoiding non-essential travel and monitoring local news.",
    source_url: null,
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
    summary: "Eskom has announced planned maintenance resulting in scheduled load-shedding in Johannesburg and surrounding areas. Two-hour blocks during off-peak hours. Dates: this week through Friday.",
    source_url: null,
    source_name: "Infrastructure alerts",
    infrastructure_impact: "Power interruptions during scheduled windows.",
    affected_consultant_count: 8,
    status: "active",
  },
];

async function main() {
  const connectionString =
    process.env.DATABASE_URL_POOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error("Database connection not configured. Set DATABASE_URL_POOLED or DATABASE_URL in .env.local");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    const { rows: existing } = await pool.query("SELECT COUNT(*) as n FROM situations");
    const count = Number((existing[0] as { n: string })?.n ?? 0);
    if (count > 0) {
      console.log(`Situations already present (${count} rows). Skipping seed.`);
      console.log("To re-seed, truncate the situations table first.");
      process.exit(0);
    }

    for (const s of SEED_SITUATIONS) {
      await pool.query(
        `INSERT INTO situations (
          country_code, country, region, city, event_type, severity,
          title, summary, source_url, source_name, infrastructure_impact,
          affected_consultant_count, status, first_detected_at, last_checked_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
        [
          s.country_code,
          s.country,
          s.region,
          s.city,
          s.event_type,
          s.severity,
          s.title,
          s.summary,
          s.source_url,
          s.source_name,
          s.infrastructure_impact,
          s.affected_consultant_count,
          s.status,
        ]
      );
    }

    console.log(`✓ Seeded ${SEED_SITUATIONS.length} situations.`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
