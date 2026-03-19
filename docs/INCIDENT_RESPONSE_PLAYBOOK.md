# Incident Response Playbook

Quick-reference guide for common issues during the beta. Focus is on reminders and auth.

---

## ⚡ Triage-first quick commands

Before reading scenarios in detail, run these to orient yourself fast.

### Is the app up?
```bash
curl https://YOUR_APP/api/auth/csrf
# Healthy: HTTP 200 + JSON with csrfToken
# Down: connection refused / 500 / 502
```

### Are reminders processing?
```bash
# Check metrics snapshot
curl https://YOUR_APP/api/reminders/process \
  -H "Authorization: Bearer $CRON_SECRET"
# Look for: cron.reminders.process > 0 and no graph.error.* spikes

# Trigger processor manually (fixes most "reminders not sent" issues)
curl -X POST https://YOUR_APP/api/reminders/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Are there stuck/failed reminders?
```bash
npx prisma studio
# Open Reminder table → filter by status = PENDING / FAILED / PROCESSING
```

### Is the DB reachable?
```bash
npm run ops:daily
# Runs all four checks: env, DB+reminders, auth liveness, processor metrics
```

### Is the user's account set up?
```bash
# Check if their Microsoft account has a student record:
npx prisma studio
# Open Student table → search by userId (Microsoft account sub/oid)
```

---

## Severity levels

| Level | Description | Response time |
|-------|-------------|---------------|
| P0 — Critical | No one can sign in, data loss, reminders sending wrong info | Fix immediately |
| P1 — Major | A specific feature broken for multiple users | Fix within 4 hours |
| P2 — Minor | Cosmetic bug, one user affected, workaround available | Fix within 24 hours |

---

## Scenario 1: Reminders not being delivered

**Symptom:** Users say they didn't get a reminder; reminder shows `PENDING` forever in DB.

**Cause:** The reminder processor job hasn't run.

**How reminders work:**
- Reminders are processed by `POST /api/reminders/process`
- This route is called automatically on reminder page loads (client-side) **and** by a cron job if configured
- If the cron is not running (e.g., Vercel cron config missing), reminders only fire when users visit the Reminders page

**Fix steps:**
1. Check DB: `SELECT * FROM Reminder WHERE status = 'PENDING' AND sendAt < NOW()`
2. If rows exist, the processor hasn't run. Trigger manually:
   ```bash
   curl -X POST https://YOUR_APP/api/reminders/process \
     -H "x-cron-secret: YOUR_CRON_SECRET"
   ```
3. If rows don't exist, reminders weren't generated. Check the sync step — visit the Reminders page and click "Sync now".
4. Verify cron is configured: check `vercel.json` or your hosting platform's cron settings.

**Cron endpoint:** `POST /api/reminders/process`
**Required header:** `x-cron-secret: <CRON_SECRET env var>`
**Schedule (recommended):** Every 15 minutes — `*/15 * * * *`

---

## Scenario 2: User can't sign in (Microsoft auth failure)

**Symptom:** User hits login page, clicks "Continue with Microsoft", gets redirected back with an error.

**Common error codes:**

| Error | Meaning | Fix |
|-------|---------|-----|
| `OAuthCallback` | Microsoft redirected with error | Check Azure app redirect URIs; must match exactly |
| `AccessDenied` | User account blocked or not in allowed tenant | Check `AZURE_AD_TENANT_ID` — `common` allows any tenant |
| `OAuthSignin` | State mismatch / CSRF | User probably refreshed mid-flow; ask them to try again from a fresh tab |
| `Configuration` | Missing env vars | Check `NEXTAUTH_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_*` vars are set |

**Check first:**
```bash
# Are env vars set?
grep -E "(AUTH_MICROSOFT|NEXTAUTH)" .env

# Does the NextAuth endpoint respond?
curl https://YOUR_APP/api/auth/csrf
```

**Quick fix for "it worked yesterday":** Redeploy — sometimes edge cache or session store needs a reset.

---

## Scenario 3: Dashboard shows blank / error page

**Symptom:** User sees "Something went wrong" error boundary after signing in.

**Most common cause:** Demo student not seeded, or DB migration didn't run.

**Fix steps:**
1. Check server logs for `[ENV ERROR]` or Prisma errors.
2. If student record missing, re-run seed:
   ```bash
   npm run db:seed
   ```
3. If schema mismatch, run migration:
   ```bash
   npm run db:migrate:deploy
   ```
4. If error is `requireCurrentStudent` throwing, the user's Microsoft account may not have a student record. Check `Student` table for their `userId`.

---

## Scenario 4: Timetable import fails (CSV/ICS)

**Symptom:** User uploads file, gets error toast or nothing happens.

**Fix steps:**
1. Ask for the file and try importing in dev with `DEV_AUTH_BYPASS=true`.
2. Common issues:
   - CSV column names don't match expected headers (check `timetable-parsers.ts` for accepted formats)
   - ICS file uses non-standard VEVENT fields
   - File encoding (BOM characters) — ask user to re-export as UTF-8
3. If parsing fails silently, check browser console for the API response from `POST /api/timetable`.

**Workaround for user:** "Try the manual entry form — you can type your classes in one by one while I investigate."

---

## Scenario 5: Email scan returns no results

**Symptom:** User runs email scan, metrics stay at 0 even though they have academic emails.

**Cause options:**
- Microsoft Graph not connected (check `AZURE_AD_*` env vars and Graph status badge on Dashboard)
- Emails older than scan window
- AI classification returning `NOT_SCHEDULE_RELATED` for all emails

**Fix steps:**
1. On dashboard, check the "Microsoft Graph readiness" card — must show `CONNECTED`.
2. If showing `NOT_CONFIGURED`: Microsoft Graph credentials are missing. See `PRODUCTION_ENV_CHECKLIST.md`.
3. If connected but still 0 results: check `EmailProcessingLog` table — are rows being created?
4. If rows created but all `processingStatus = 'NOT_SCHEDULE_RELATED'`: the AI prompt may need adjustment for your university's email format.

---

## General debug checklist

```
1. Check server logs first — look for stack traces or [ERROR] lines
2. Check DB state (Prisma Studio: npx prisma studio)
3. Reproduce in dev with DEV_AUTH_BYPASS=true if possible
4. Roll back if P0 and fix isn't obvious in 15 minutes
```

---

## Rollback

See `DEPLOY_CHECKLIST.md` → Rollback Notes for full instructions.

**Quick rollback (no DB changes):** Redeploy previous git tag.
**With DB changes:** Restore from backup first, then redeploy.

---

## Contact / escalation

*(Fill in before launch)*

- App owner: [Your name + contact]
- Hosting platform support: [Link to Vercel/Render support]
- Microsoft Azure support (auth issues): [Link]
