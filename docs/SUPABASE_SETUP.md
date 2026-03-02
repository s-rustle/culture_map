# Supabase Database Setup (via Vercel)

To run the migration and verify the connection, you need the **Postgres connection string** from Supabase.

## 1. Get the connection string

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **Settings** → **Database**
3. Under **Connection string**, select **URI**
4. Copy the connection string (it includes your database password)
5. Replace `[YOUR-PASSWORD]` with your actual database password if prompted

Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

## 2. Add to .env.local

```
DATABASE_URL=postgresql://postgres.xxxxx:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Or use `SUPABASE_DB_URL` as the variable name.

## 3. Run the migration

```bash
npm run db:migrate
```

Expected output:

```
✓ Connection OK: 1
✓ Migration 001_schema.sql applied
✓ Tables created: coach_subscriptions, coaches, notifications, scan_history, sessions, situations
✓ Database is ready.
```

## 4. Verify

The migration creates all tables. You can also verify in Supabase → **Table Editor** to see the new tables.
