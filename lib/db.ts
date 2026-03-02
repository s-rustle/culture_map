/**
 * Global Pulse — Database client (Vercel Postgres / Neon)
 *
 * Uses @vercel/postgres. Connection from DATABASE_URL (or POSTGRES_URL from
 * Vercel's Neon integration). See docs/DATABASE_SETUP.md.
 */

import { createPool } from "@vercel/postgres";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

const pool = connectionString
  ? createPool({ connectionString })
  : null;

/**
 * SQL template literal for queries. Check isDatabaseConfigured() before use.
 *
 * @example
 * if (sql) {
 *   const { rows } = await sql`SELECT * FROM coaches WHERE email = ${email}`;
 * }
 */
export const sql = pool?.sql ?? null;

/** Pool instance for connect() when needed. */
export { pool };

/**
 * Whether database is configured (DATABASE_URL or POSTGRES_URL set).
 */
export function isDatabaseConfigured(): boolean {
  return !!connectionString;
}
