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

The app uses `DATABASE_URL` or `POSTGRES_URL` (in that order). Set one in `.env.local`:

```
# Option A: Use POSTGRES_URL (from Vercel env pull)
POSTGRES_URL=postgres://user:password@host/db?sslmode=require

# Option B: Use DATABASE_URL (same format)
DATABASE_URL=postgres://user:password@host.neon.tech/dbname?sslmode=require
```

Neon connection strings typically look like:
`postgres://USER:PASSWORD@ep-XXX-XXX.region.aws.neon.tech/neondb?sslmode=require`

### 4. Client usage

```typescript
import { sql, isDatabaseConfigured } from "@/lib/db";

if (isDatabaseConfigured() && sql) {
  const { rows } = await sql`SELECT * FROM coaches`;
}
```
