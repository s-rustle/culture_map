/**
 * Ingest known events into situations — real data from data/known-events.json
 * Run: npx tsx scripts/ingest-known-events.ts
 */

import "./bootstrap-env";
import { ingestKnownEvents } from "../lib/ingest-known-events";

async function run() {
  const connectionString =
    process.env.DATABASE_URL_POOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error("Database connection not configured. Set DATABASE_URL_POOLED or DATABASE_URL in .env.local");
    process.exit(1);
  }

  const { inserted, error } = await ingestKnownEvents();
  if (error) {
    console.error("Ingest failed:", error);
    process.exit(1);
  }
  console.log(`✓ Ingested ${inserted} situations from known-events.json`);
}

run();
