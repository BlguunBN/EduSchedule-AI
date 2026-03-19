# Supabase DB Setup (Database-only migration)

This project now uses **PostgreSQL (Supabase)** via Prisma.
Auth flow remains unchanged (NextAuth + Microsoft).

## 1) Create Supabase project
1. Create a new Supabase project.
2. Open **Project Settings → Database**.
3. Copy both connection strings:
   - **Pooled** connection (port `6543`) for app runtime
   - **Direct** connection (port `5432`) for Prisma migrations

## 2) Configure environment
Update your `.env`:

```env
# Runtime (pooled)
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"

# Migrations (direct)
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
```

Keep your existing auth/env variables (`AUTH_SECRET`, `AUTH_MICROSOFT_*`, etc.).

## 3) Apply schema + seed
From project root:

```bash
npm run setup:supabase
```

Equivalent manual sequence:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

## 4) Validate app

```bash
npm run build
npm run smoke:prod
```

(For full smoke API checks, run server first: `npm start`.)

## 5) Notes / caveats
- This migration is **DB only**. No Supabase Auth migration was done.
- Prisma uses `DATABASE_URL` at runtime and `DIRECT_URL` for migrations.
- If migration history is missing in your environment, you can temporarily use:
  ```bash
  npm run db:push
  npm run db:seed
  ```
  then baseline migrations properly later.
- Do not expose DB credentials in client code.

## Rollback quick path (dev)
If needed, point `.env` back to your previous DB values, then rerun:

```bash
npm run db:generate
npm run build
```
