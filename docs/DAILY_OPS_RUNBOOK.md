# Daily Ops Runbook — EduScheduleAI Beta

> Run the daily check in under 10 minutes. This doc covers the full routine.

---

## Daily ops checklist (~5–10 min)

### Step 1 — Run the daily ops script (2 min)

```bash
# Server must be running for full check:
npm start &   # skip if already running

npm run ops:daily
```

The script checks:
- Required env vars present
- DB connected, no stuck/failed reminders
- App is responding (auth endpoint)
- Reminder processor metrics (errors, run count)

**Interpret output:**
- `✅ OK` — all good, move on
- `⚠️ WARN` — note it; investigate if it recurs tomorrow
- `❌ ACTION` — needs attention before users hit it

---

### Step 2 — Trigger reminder processor manually if needed (1 min)

If `ops:daily` reports stuck PENDING reminders, or you want to confirm delivery:

```bash
# Dev (no secret needed):
curl -X POST http://localhost:3000/api/reminders/process

# Production:
curl -X POST https://YOUR_APP/api/reminders/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `{ "ok": true, "data": { "processed": N, "sent": N, "failed": 0, ... } }`

---

### Step 3 — Quick DB review (2 min, if any warnings)

If `ops:daily` flagged anything DB-related:

```bash
npx prisma studio
# Opens at http://localhost:5555
```

Look at the `Reminder` table:
- `FAILED` status → check `lastError` column
- `PENDING` with old `sendAt` → processor isn't running
- `PROCESSING` with old `updatedAt` (>5 min) → zombie; app crashed mid-batch

---

### Step 4 — Scan server logs (2 min, if any errors)

If you're running locally:
```bash
# Filter for errors in running server (new terminal):
# Look for lines with "level":"error"
```

On Vercel/Render: open the platform log viewer, filter by `"level":"error"` or `ERROR`.

Key events to act on:
- `graph.error.GRAPH_TOKEN_EXPIRED` — auth token issue
- `reminders.process.error` — processor crashed
- `reminder.max_attempts_reached` — reminder permanently failed

See `OBSERVABILITY.md` for the full event dictionary.

---

### Step 5 — Check processor metrics (1 min, if cron suspected)

```bash
curl http://localhost:3000/api/reminders/process
# Or with auth:
curl http://localhost:3000/api/reminders/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Healthy response:** `cron.reminders.process >= 1` and no `error.*` keys with high counts.

---

## If something's wrong — quick triage

**Use `INCIDENT_RESPONSE_PLAYBOOK.md` for full details. Short version:**

| Symptom | Command to run first |
|---------|----------------------|
| Reminders not sent | `curl -X POST .../api/reminders/process -H "Authorization: Bearer $CRON_SECRET"` |
| Login broken | `curl https://YOUR_APP/api/auth/csrf` — if 500/404, app is down |
| Dashboard blank | `npm run db:migrate:deploy && npm run db:seed` |
| Timetable import fails | Try in dev with `DEV_AUTH_BYPASS=true`; check browser console |
| Email scan returns 0 | Check MS Graph status on Dashboard; verify `AZURE_AD_*` env vars |

---

## Full pre-release check (before any deploy)

```bash
# Stop server first (Windows: Ctrl+C)
npm run db:generate    # Prisma client
npm run lint           # ESLint
npm run build          # TypeScript + Next.js build
npm start &            # Start prod server
npm run smoke          # Full smoke check
```

Or all-in-one (server must already be running):
```bash
npm run prerelease:check
```

---

## Known limitations

1. **Metrics reset on restart** — `GET /api/reminders/process` counters are in-memory only. A fresh deploy shows all zeros. This is expected; check after the first cron cycle (15–30 min).
2. **Windows `db:generate` file lock** — Stop the server before running `npm run db:generate` on Windows to avoid the Prisma DLL lock issue.
3. **No alerting** — There's no automated alert if cron stops. The daily ops check is a manual substitute until Sentry/Datadog/Uptime Robot is wired in.
4. **`EMAIL_DIGEST` channel is a no-op** — Reminders with `channel=EMAIL_DIGEST` are processed and logged as IN_APP delivery. No email is actually sent until SMTP is wired.
5. **Processor run count is per cold-start** — On serverless (Vercel), each function invocation may be a fresh instance, so `cron.reminders.process` may always be 1.
6. **`ops:daily` requires a running server for API checks** — If the server is down, DB and env checks still run; API checks are skipped with a note.

---

## Time estimate

| Step | Time |
|------|------|
| `npm run ops:daily` | ~1–2 min |
| Manual processor trigger (if needed) | ~1 min |
| Prisma Studio review (if flagged) | ~2–3 min |
| Log scan (if errors) | ~2 min |
| **Total** | **5–8 min** |
