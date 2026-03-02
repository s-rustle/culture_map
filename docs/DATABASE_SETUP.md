# Database Setup — Vercel Postgres (Neon)

Schema reference: [Global_Pulse_Amendment_1.md](./Global_Pulse_Amendment_1.md) (Change 3) + planning doc.

## Tables

- **situations** — active/historical events
- **coaches** — email recipients, `is_admin` for role
- **coach_subscriptions** — per-coach country + event type + severity preferences
- **notifications** — draft/sent emails to coaches (never consultants)
- **scan_history** — audit trail of automated scans
- **sessions** — role-aware auth (optional; JWT used for stateless sessions)

## Vercel Postgres (Neon) Setup

### 1. Add Neon to your Vercel project

1. Open your project on [Vercel](https://vercel.com)
2. Go to **Storage** → **Create Database** → choose **Neon** (or **Postgres** from Marketplace)
3. Follow the prompts to provision a database
4. Vercel will inject `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` into your project

### 2. Run the schema

Using the Vercel-provided connection string:

```bash
# Pull env vars (includes POSTGRES_URL)
vercel env pull .env.local

# Run the migration (use POSTGRES_URL or set DATABASE_URL)
psql "$POSTGRES_URL" -f migrations/001_schema.sql
```

Or use Neon's SQL Editor:
1. Open [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to **SQL Editor**
4. Paste the contents of `migrations/001_schema.sql`
5. Run

### 3. Connection string

The app uses native `pg` — **both direct and pooled** connection strings work. Order: `DATABASE_URL_POOLED` → `DATABASE_URL` → `POSTGRES_URL` → `SUPABASE_DB_URL`.

- **Vercel:** Use `DATABASE_URL` (Vercel-managed) or add `DATABASE_URL_POOLED` with your Supabase pooled URI.
- **Supabase:** Direct (port 5432) or pooled (port 6543) both work. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 4. Ingest real data from known-events + roster

To populate situations from your `data/known-events.json` and `data/roster.csv`:

```bash
npm run db:ingest-known-events
```

Filters to countries in roster or `PRIORITY_COUNTRIES`, counts affected consultants per country. Or click "Load real data" in the dashboard (admin only).

### 5. Client usage

```typescript
import { sql, isDatabaseConfigured } from "@/lib/db";

if (isDatabaseConfigured() && sql) {
  const { rows } = await sql`SELECT * FROM coaches`;
}
```
