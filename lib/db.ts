/**
 * Global Pulse — Database client (pg + Supabase / Neon / Vercel)
 *
 * Uses native `pg` Pool — works with direct OR pooled connection strings.
 * No @vercel/postgres pool validation that blocks direct connections.
 * Connection from DATABASE_URL_POOLED, DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL.
 */

import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL_POOLED ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

let pool: Pool | null = null;
if (connectionString) {
  try {
    pool = new Pool({ connectionString });
  } catch (err) {
    console.warn("Database pool creation failed (build may continue):", (err as Error).message);
    pool = null;
  }
}

/**
 * SQL tagged template — compatible with existing sql`...` usage.
 * Returns { rows } like @vercel/postgres.
 */
async function query(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  if (!pool) throw new Error("Database not configured");
  const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
  const result = await pool.query(text, values);
  return { rows: result.rows as Record<string, unknown>[] };
}

/**
 * SQL template literal for queries. Check isDatabaseConfigured() and sql before use.
 */
export const sql = pool
  ? (strings: TemplateStringsArray, ...values: unknown[]) => query(strings, ...values)
  : null;

export { pool };

/**
 * Whether database is configured and pool is available.
 */
export function isDatabaseConfigured(): boolean {
  return !!pool && !!sql;
}
