/**
 * Run database migration
 *
 * Usage: npx tsx scripts/run-migration.ts
 * Requires: DATABASE_URL or POSTGRES_URL or SUPABASE_DB_URL in .env.local
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";

// Load .env.local
config({ path: join(process.cwd(), ".env.local") });

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("Missing connection string. Set DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString });

  try {
    // Test connection
    const client = await pool.connect();
    const { rows } = await client.query("SELECT 1 as ok");
    console.log("✓ Connection OK:", rows[0]?.ok);

    // Run migration
    const migrationPath = join(process.cwd(), "supabase", "migrations", "001_schema.sql");
    const sql = readFileSync(migrationPath, "utf-8");
    await client.query(sql);
    console.log("✓ Migration 001_schema.sql applied");

    // Verify tables exist
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log("✓ Tables created:", tables.map((t) => t.table_name).join(", "));

    client.release();
    await pool.end();
    console.log("\n✓ Database is ready.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
