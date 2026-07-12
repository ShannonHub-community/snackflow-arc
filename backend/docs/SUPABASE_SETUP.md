# Supabase Setup Guide for SnackFlow

SnackFlow uses Supabase purely as a managed PostgreSQL host -- the backend
talks to it directly via SQLAlchemy/asyncpg, not through Supabase's
client SDK or Row Level Security policies (those are optional extras you
can layer on later if you expose the DB to a frontend directly).

## 1. Create a Supabase project
1. Go to https://supabase.com/dashboard and create a new project.
2. Choose a strong database password -- you'll need it for `DATABASE_URL`.
3. Wait for provisioning to complete (~2 minutes).

## 2. Get your connection string
In your Supabase project: **Project Settings -> Database -> Connection string**.

Supabase offers two relevant connection modes:

| Mode | Port | When to use |
|---|---|---|
| **Direct connection** | 5432 | Local development, or any deployment that keeps a small number of long-lived connections |
| **Session pooler (PgBouncer)** | 5432 (via pooler host) | Recommended for serverless/many-worker production deployments to avoid exhausting Postgres's connection limit |
| **Transaction pooler** | 6543 | Only for very short-lived, single-statement connections -- **do not use this for SnackFlow**, since some operations (row locks for `DailyCounter`, multi-statement transactions) need session-level guarantees the transaction pooler doesn't provide |

For SnackFlow, use the **direct connection** or **session pooler** string, e.g.:
```
postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

## 3. Configure `.env`
SnackFlow's `Settings.DATABASE_URL` validator automatically upgrades a
plain `postgres://` or `postgresql://` URL to the async `postgresql+asyncpg://`
driver, so you can paste Supabase's string as-is:
```
DATABASE_URL=postgresql://postgres:your_password@db.xxxxxxxx.supabase.co:5432/postgres
```

## 4. Enable the `pgcrypto` / `uuid-ossp` extension (for gen_random_uuid, if needed)
Supabase Postgres ships with `pgcrypto` enabled by default (used for
`gen_random_uuid()` if you seed data manually via SQL). SnackFlow's ORM
models generate UUIDs application-side (`default=uuid.uuid4`), so this is
not strictly required for the app to function, but it's handy for manual
seeding via the SQL editor:
```sql
create extension if not exists pgcrypto;
```

## 5. Run Alembic migrations against Supabase
From the `server/` directory, with `.env` pointing at your Supabase URL:
```bash
python3 -m alembic upgrade head
```
This creates all 11 tables and 5 ENUM types directly in your Supabase
Postgres instance. You can verify in **Supabase Dashboard -> Table Editor**.

## 6. (Optional) Row Level Security
Since the FastAPI backend connects with the `postgres` superuser role and
enforces all authorization itself (admin API key, business rules in the
service layer), Row Level Security (RLS) is **not required** for
SnackFlow to function correctly. If you later expose any table directly
to a frontend via the Supabase client SDK (bypassing this API), enable
RLS on that table first and write explicit policies -- otherwise it will
be fully readable/writable by anyone with your anon key.

## 7. Connection pool sizing
Supabase's free tier direct connection limit is modest (~60-90
connections shared across all clients). Keep `DB_POOL_SIZE` and
`DB_MAX_OVERFLOW` in `.env` conservative for a single backend instance:
```
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```
If you deploy multiple backend instances/workers, switch to the **session
pooler** connection string and/or lower these values so
`instances * (pool_size + max_overflow) < Supabase's connection limit`.

## 8. Monitoring
Supabase's dashboard (**Database -> Reports**) shows active connections,
query performance, and disk usage -- useful for spotting a leaking
session/connection early.

## 9. Backups
Supabase's paid tiers include automated daily backups with point-in-time
recovery. On the free tier, periodically export a backup yourself:
```bash
pg_dump "postgresql://postgres:your_password@db.xxxxxxxx.supabase.co:5432/postgres" \
  -F c -f snackflow_backup.dump
```
