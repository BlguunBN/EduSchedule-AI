# EduScheduleAI — Beta Readiness Report

**Date:** 2026-03-19  
**Phase:** C — Track 1 (Live Validation)  
**Server tested against:** `http://localhost:3000` (production build running locally)

---

## Pass/Fail Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | `db:generate` runs cleanly | ⚠️ WARN | Fails when server holds the Prisma DLL (Windows lock). Passes when server is stopped. Not a code issue — expected on Windows dev machines. |
| 2 | `lint` — zero ESLint errors | ✅ PASS | No warnings or errors. |
| 3 | `build` — TypeScript + Next.js production build | ✅ PASS | Clean compile, all 27 routes resolved. No errors. |
| 4 | ENV validation (all required vars set) | ✅ PASS | `AUTH_SECRET`, `DATABASE_URL`, Microsoft credentials all present and non-placeholder. |
| 5 | DB connectivity (Prisma `SELECT 1`) | ✅ PASS | SQLite dev.db reachable and queryable. |
| 6 | `GET /api/auth/csrf` → HTTP 200 | ✅ PASS | NextAuth is alive. |
| 7 | `GET /api/reminders` → HTTP 401 (unauthed) | ✅ PASS | Proper JSON error body returned. |
| 8 | `GET /api/calendar/events` → HTTP 401 | ✅ PASS | |
| 9 | `GET /api/history` → HTTP 401 | ✅ PASS | |
| 10 | `GET /api/settings` → HTTP 401 | ✅ PASS | |
| 11 | `GET /api/timetable` → HTTP 401 | ✅ PASS | |
| 12 | `GET /api/reminders/process` → HTTP 200 (metrics) | ✅ PASS | Returns `{ metrics: {...} }` snapshot. Graph error counts visible. |
| 13 | `POST /api/reminders/process` → HTTP 200 | ✅ PASS | In dev without `CRON_SECRET`, runs unrestricted. Returns `{ processed, sent, failed, skipped, durationMs }`. |
| 14 | CRON_SECRET guard logic | ✅ PASS | Dev with no `CRON_SECRET` → open. Dev/prod with `CRON_SECRET` set → requires Bearer token. Production without `CRON_SECRET` → HTTP 503. |
| 15 | Reminder status state machine (PENDING → PROCESSING → SENT/FAILED) | ✅ PASS | Atomically claims batch, marks SENT, reverts to PENDING on retry-eligible failure, marks FAILED after `MAX_DELIVERY_ATTEMPTS`. |
| 16 | Graph error classification (`classifyGraphError`) | ✅ PASS | All known codes (401→GRAPH_TOKEN_EXPIRED, 403→GRAPH_PERMISSION_DENIED/GRAPH_FORBIDDEN, 429→GRAPH_THROTTLED, 5xx→GRAPH_SERVER_ERROR) map to actionable messages. Never silently swallowed. |
| 17 | Graph errors appear in runtime metrics | ✅ PASS | `graph.error.GRAPH_TOKEN_EXPIRED` visible in process metrics snapshot during this test run. |
| 18 | Auth 401 response is valid JSON | ✅ PASS | `{"ok":false,"error":{"code":"UNAUTHORIZED","message":"Sign in required"}}` |
| 19 | `emails/page.tsx` mock-data warning at build time | ✅ FIXED | Deprecated `/emails` prototype page now returns a stub in production; no mock-data `console.error` during build. |
| 20 | Duplicate `AUTH_SECRET` in `.env` | ✅ FIXED | Removed the placeholder first line; only the real hex secret remains. |
| 21 | Smoke check covers reminders/process endpoints | ✅ ADDED | Both GET and POST `/api/reminders/process` added to the smoke route table. |
| 22 | Full smoke: 10/10 checks pass against live server | ✅ PASS | |

---

## Changes Applied This Session

| File | Change |
|------|--------|
| `.env` | Removed duplicate placeholder `AUTH_SECRET` line. |
| `scripts/smoke-check.ts` | Added `GET /api/reminders/process` and `POST /api/reminders/process` to route smoke table. |
| `src/app/emails/page.tsx` | Guard: returns static stub page in production to prevent mock-data `console.error` at build time; dev path uses dynamic imports. |

---

## Known Caveats / Remaining Issues

### Not Blockers for Beta
1. **`db:generate` on Windows while server running** — Windows file lock on `.prisma/client/query_engine-windows.dll.node` prevents `prisma generate` while the app server holds it. Workaround: stop server, generate, restart. No code change needed.
2. **`/emails` prototype page is still live** — It's now a stub in prod, but the route exists. Could be removed in a future cleanup; excluded from the dashboard nav so users won't find it organically.
3. **`EMAIL_DIGEST` channel is a no-op** — Reminder `channel=EMAIL_DIGEST` is logged and treated as IN_APP delivery. Actual SMTP/SES wiring is post-beta work.
4. **Microsoft Graph live sync is read-only** — `graphFetchWithRetry` is wired for mail fetch, but actual write-back (calendar event creation via Graph) is not implemented. All calendar writes remain local-first.
5. **`CRON_SECRET` not set** — The reminders/process endpoint is open in dev without it. Before any internet-facing deployment, set `CRON_SECRET` in the production environment.
6. **`AUTH_MICROSOFT_TENANT_ID=common`** — Currently allows all Microsoft accounts. For a locked-down university deployment, change to the XJTLU tenant ID.

### Post-Beta Roadmap Items
- Integrate real email delivery for `EMAIL_DIGEST` reminder channel.
- Add `CRON_SECRET` secret to production deployment secrets manager.
- Move `Prisma generate` step to CI pre-start (not concurrent with running server on Windows).
- Optional: Remove or guard the `/emails` prototype route behind an `?debug=1` flag.

---

## Final Verification Commands

```bash
# With server stopped:
npm run db:generate

# Lint + build + smoke (server must be running for smoke):
npm run lint
npm run build
npm run smoke:prod   # requires server at localhost:3000
```

All three pass as of this report. ✅
