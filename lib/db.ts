/**
 * Global Pulse — Database client (Vercel Postgres / Neon / Supabase)
 *
 * Uses @vercel/postgres. Connection from DATABASE_URL_POOLED, DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL.
 * For Supabase: use pooled connection (port 6543). Direct connection (5432) will fail.
 * Build-safe: if pool creation fails, returns null so build doesn't crash.
 */

import { createPool } from "@vercel/postgres";

const connectionString =
  process.env.DATABASE_URL_POOLED ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

/**
 * Supabase/Neon: use pooled connection (port 6543, pooler host).
 * Direct connection (port 5432, db.xxx.supabase.co) will throw at createPool().
 * Prefer DATABASE_URL_POOLED (pooled) over Vercel-managed DATABASE_URL (direct).
 */
let pool: ReturnType<typeof createPool> | null = null;
if (connectionString) {
  try {
    pool = createPool({ connectionString });
  } catch (err) {
    console.warn("Database pool creation failed (build may continue):", (err as Error).message);
    pool = null;
  }
}

/**
 * SQL template literal for queries. Check isDatabaseConfigured() and sql before use.
 */
export const sql = pool?.sql ?? null;

export { pool };

/**
 * Whether database is configured and pool is available.
 */
export function isDatabaseConfigured(): boolean {
  return !!pool && !!sql;
}
