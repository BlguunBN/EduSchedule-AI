# Deployment Checklist

Follow this for every production deployment. Git tag the release after all items pass.

---

## Pre-Deploy

- [ ] `git status` is clean (no uncommitted changes)
- [ ] Branch is merged to `main` / release branch
- [ ] All environment variables set per [PRODUCTION_ENV_CHECKLIST.md](./PRODUCTION_ENV_CHECKLIST.md)
- [ ] Run full pre-release check:
  ```bash
  npm run prerelease:check
  ```
  This runs: `db:generate` → `lint` → `build` → smoke-check.

## Database

- [ ] **New migration present?** Run:
  ```bash
  npm run db:migrate:deploy
  ```
  This applies any pending Prisma migrations. It is idempotent — safe to re-run.
- [ ] If this is a first-time deploy (empty DB), also run seed:
  ```bash
  npm run db:seed
  ```
- [ ] Verify migration completed: check `_prisma_migrations` table, all rows should have `finished_at` set.

## Deploy

- [ ] Build the production bundle:
  ```bash
  npm run build
  ```
- [ ] Deploy the built artifact to your platform (Vercel / Render / Docker / VPS).
- [ ] Set all required env vars in the platform dashboard (NOT in .env — that file is dev-only).

## Post-Deploy Verification

- [ ] Server starts without env errors (check logs for `[ENV ERROR]` lines).
- [ ] `GET /api/auth/csrf` returns HTTP 200 (verifies NextAuth is alive).
- [ ] Login flow works end-to-end (Microsoft Entra ID redirects and completes).
- [ ] `GET /api/reminders` returns HTTP 401 for unauthenticated requests (not 500).
- [ ] `GET /api/calendar/events` returns HTTP 401 for unauthenticated requests.
- [ ] Dashboard loads after signing in.
- [ ] (Optional) Run smoke check against production URL:
  ```bash
  npm run smoke -- --base-url https://your-prod-domain.com
  ```

## Rollback Triggers

Roll back immediately if:
- Server throws on startup (env errors)
- 5xx rate spikes above normal baseline
- Auth flow broken (users can't sign in)
- Database migration failed (see Rollback Notes below)

---

## Rollback Notes

### Application Code

Simply redeploy the previous version tag. Next.js is stateless — no server-side
state cleanup needed.

### Database / Schema Changes (Prisma Migrations)

> **Warning**: Prisma migrations are applied forward. Rolling back a migration that
> adds a NOT-NULL column or renames a table requires manual intervention.

**Safe rollback path (additive-only migrations):**

1. Redeploy previous app code version.
2. If the new migration only *added* columns/tables (no drops, renames, or NOT-NULL constraints),
   the old code runs fine against the new schema — rollback app code alone suffices.

**Non-additive migration rollback (drops, renames, NOT-NULL without default):**

1. Stop new server instances.
2. Restore from DB backup taken immediately before deploy.
3. Redeploy previous app code.
4. Verify with smoke check.

**General DB rollback rules:**

- Always take a DB snapshot before deploying a migration.
- Mark destructive migrations with a comment: `-- DESTRUCTIVE: backup required`.
- For zero-downtime rollback: avoid `ALTER COLUMN ... NOT NULL` without a default;
  instead add nullable first, backfill, then add the constraint in a follow-up deploy.

### Migration failure mid-deploy

If `prisma migrate deploy` fails:
1. Check `_prisma_migrations` for the failed row.
2. Fix the schema issue.
3. If the migration is partially applied: restore from backup; do NOT attempt to
   manually un-apply — Prisma tracks migrations by checksum.

---

## Release Tag Convention

```
v<major>.<minor>.<patch>-beta.<n>
```

Example: `v0.2.0-beta.1`

After a clean deploy, tag and push:

```bash
git tag v0.2.0-beta.1
git push origin v0.2.0-beta.1
```
