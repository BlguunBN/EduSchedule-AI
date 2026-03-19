# Observability Guide — EduScheduleAI Beta

> Where to look, what signals mean, what thresholds trigger action.

---

## Quick orientation

This app has three observability surfaces:

| Surface | What it shows | How to access |
|---------|---------------|---------------|
| **Server logs** | Structured JSON lines from `logger.ts` | Platform log viewer / terminal stdout |
| **In-process metrics** | Counters since last cold start | `GET /api/reminders/process` |
| **Database state** | Reminder statuses, DB health | Prisma Studio / direct SQL queries |

Logs and metrics reset on each server restart. The DB is the only durable record.

---

## Server logs

### Log format

All server log lines are JSON:

```json
{ "ts": "2026-03-19T10:00:00.000Z", "level": "info", "event": "reminders.process.done", "processed": 3, "sent": 3, "failed": 0, "skipped": 0, "durationMs": 412 }
```

In development, the same JSON is printed to the terminal.

### Key log events and what they mean

| Event | Level | Meaning | Normal? |
|-------|-------|---------|---------|
| `reminders.process.start` | info | Processor job triggered (cron or manual) | ✅ |
| `reminders.process.done` | info | Processor completed a batch | ✅ |
| `reminders.process.error` | error | Processor crashed entirely | ❌ |
| `graph.fetch_failed` | error | Microsoft Graph API call failed | ❌ |
| `reminder.sent` | info | A reminder was delivered | ✅ |
| `reminder.failed` | warn | A reminder delivery attempt failed | ⚠️ |
| `reminder.max_attempts_reached` | warn | Reminder permanently failed after retries | ❌ |
| `graph.error.GRAPH_TOKEN_EXPIRED` | error | Microsoft token is stale; Graph auth needs refresh | ❌ |
| `graph.error.GRAPH_THROTTLED` | warn | Graph API rate-limited; will retry | ⚠️ |
| `graph.error.GRAPH_PERMISSION_DENIED` | error | Missing Graph API permission scope | ❌ |

### How to read log output

**Find all errors in the last 100 lines (local dev terminal):**
```bash
# Pipe next start output through grep — run in a second terminal:
npm start 2>&1 | grep '"level":"error"'
```

**Find specific event:**
```bash
npm start 2>&1 | grep 'reminders.process'
```

**Vercel / Render / other hosted platforms:** Use the platform's log viewer and filter by `"level":"error"`.

---

## In-process metrics

The metrics counter (`metrics.ts`) accumulates since the last server cold start.

### Reading metrics

```bash
# With no CRON_SECRET set (dev):
curl http://localhost:3000/api/reminders/process

# With CRON_SECRET set:
curl http://localhost:3000/api/reminders/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

Response shape:
```json
{
  "ok": true,
  "data": {
    "metrics": {
      "cron.reminders.process": 5,
      "error.graph.fetch_failed": 0,
      "graph.error.GRAPH_TOKEN_EXPIRED": 1
    }
  }
}
```

### Metric keys and thresholds

| Metric key | Meaning | Threshold to investigate |
|------------|---------|--------------------------|
| `cron.reminders.process` | Processor was triggered N times this session | Should be > 0 daily |
| `error.reminders.process.error` | Processor crashed N times | > 0 → investigate immediately |
| `graph.error.GRAPH_TOKEN_EXPIRED` | MS token expired N times | > 0 → check Graph auth config |
| `graph.error.GRAPH_THROTTLED` | Rate-limited N times | > 10 → reduce polling frequency |
| `graph.error.GRAPH_PERMISSION_DENIED` | Missing scope N times | > 0 → check Azure app permissions |
| `graph.error.GRAPH_SERVER_ERROR` | MS Graph 5xx errors | > 3 → possible MS outage |
| `error.*` (any) | Generic error counter | > 0 → check logs for context |

> ⚠️ **Caveat:** Metrics reset on cold start. A fresh deploy shows all zeros — this is expected. Look for a non-zero `cron.reminders.process` count after the first cron cycle to confirm the processor is running.

---

## Database state

The database is the ground truth for reminder status. Use Prisma Studio for interactive inspection:

```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Reminder status lifecycle

```
PENDING → PROCESSING → SENT
                     ↘ FAILED (after MAX_DELIVERY_ATTEMPTS)
                     ↗ PENDING (retry-eligible transient failures)
```

### Reminder DB queries for ops

```sql
-- Overdue PENDING reminders (stuck processor?)
SELECT id, sendAt, channel, deliveryAttempts
FROM Reminder
WHERE status = 'PENDING' AND sendAt < datetime('now');

-- Reminder in PROCESSING for >5 minutes (zombie — crash?)
SELECT id, sendAt, updatedAt
FROM Reminder
WHERE status = 'PROCESSING'
  AND updatedAt < datetime('now', '-5 minutes');

-- All FAILED reminders
SELECT id, sendAt, deliveryAttempts, lastError
FROM Reminder
WHERE status = 'FAILED'
ORDER BY sendAt DESC;

-- Summary counts
SELECT status, COUNT(*) as count
FROM Reminder
GROUP BY status;
```

> SQLite syntax shown above. Adjust to PostgreSQL for production if migrated.

### Action thresholds

| Condition | Threshold | Action |
|-----------|-----------|--------|
| PENDING reminders older than sendAt | > 30 min | Trigger processor manually |
| PENDING reminders older than sendAt | > 2 hours | Investigate cron config; escalate |
| PROCESSING reminders older than updatedAt | > 5 min | App crashed mid-batch; reset to PENDING manually |
| FAILED reminders | Any | Check `lastError` field; see Scenario 1 in `INCIDENT_RESPONSE_PLAYBOOK.md` |

---

## Health check endpoints

| Endpoint | Auth required | Returns |
|----------|---------------|---------|
| `GET /api/auth/csrf` | None | `{ csrfToken: "..." }` — NextAuth alive |
| `GET /api/reminders/process` | CRON_SECRET (if set) | Metrics snapshot |
| `GET /api/reminders` | User session | 401 if unauthenticated (expected) |

Use `GET /api/auth/csrf` as the primary liveness probe. If it returns anything other than HTTP 200, the app is down.

---

## Reminder processor observability

The processor is triggered by:
1. **Cron** — `vercel.json` cron or external `curl` on a schedule
2. **Page visit** — Reminders dashboard page triggers `POST /api/reminders/process` on load (client-side fire-and-forget)

### Confirming cron is running

After your first deployment, check within 15–30 minutes:

```bash
# Metrics should show cron.reminders.process >= 1
curl https://your-app.com/api/reminders/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

If `cron.reminders.process` is still 0 after 30 minutes, cron is not firing. Check:
- `vercel.json` has the cron entry
- `CRON_SECRET` env var is set in the platform dashboard
- Platform cron is enabled (Vercel: Cron Jobs tab in project settings)

### Manually trigger the processor

```bash
# Dev (no CRON_SECRET needed):
curl -X POST http://localhost:3000/api/reminders/process

# Production:
curl -X POST https://your-app.com/api/reminders/process \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected successful response:
```json
{
  "ok": true,
  "data": {
    "processed": 2,
    "sent": 2,
    "failed": 0,
    "skipped": 0,
    "durationMs": 340
  }
}
```

`processed=0` is normal if no reminders are due at that moment.

---

## Signal interpretation quick-reference

| What you see | Most likely cause | First action |
|-------------|-------------------|-------------|
| `graph.error.GRAPH_TOKEN_EXPIRED` in logs | Microsoft Entra token expired | Sign out and sign back in; check Graph token refresh logic |
| All reminders stuck PENDING | Cron not running | Trigger manually; check cron config |
| PROCESSING reminders stuck > 5 min | App crashed mid-batch | Check logs; manually reset those rows |
| FAILED reminders accumulating | Delivery errors (Graph, auth) | Check `lastError`; see Scenario 1 in Playbook |
| `error.reminders.process.error` > 0 | Processor threw unhandled exception | Check server logs for stack trace |
| `cron.reminders.process` always 0 | Cron not firing | Verify cron config and CRON_SECRET |
| Dashboard blank / error boundary | DB migration missing, or student record missing | Run `npm run db:migrate:deploy && npm run db:seed` |
| Login fails with OAuthCallback | Azure redirect URI mismatch | Check Azure app registration |
