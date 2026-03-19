# Launch Day Operator Runbook

**Phase D — Track 1 (Beta Launch)**  
**Last validated:** 2026-03-19  
**Environment:** Windows dev machine (SQLite) → swap DATABASE_URL for production PostgreSQL on real deploy

Copy-paste each command exactly. PowerShell syntax throughout.

---

## Pre-Flight (do the day before)

### 1. Stop any running dev server, regenerate Prisma client

```powershell
# Stop dev server (Ctrl+C in its terminal), then:
cd D:\personal\Code\projects\EduScheduleAI
npx prisma generate
```

> **Why:** Windows holds the Prisma DLL while the server runs. Always generate with server stopped.

### 2. Verify database is up-to-date

```powershell
# Apply any pending migrations (idempotent — safe to re-run)
npx prisma migrate deploy
# OR for dev/SQLite:
npx prisma db push
```

### 3. Run full pre-release check (lint + build + smoke)

```powershell
# Start the server in one terminal:
npm run build
npm run start
# (leave it running, open a second terminal for the next command)

# In second terminal:
cd D:\personal\Code\projects\EduScheduleAI
npm run smoke:prod
```

Expected output (all 10 checks green):
```
[1/3] Checking environment variables...
  ✅ ENV: All required variables are set
[2/3] Checking database connectivity...
  ✅ DB: Prisma connected and query succeeded
[3/3] Checking API routes at http://localhost:3000 ...
  ✅ Reminders API: HTTP 401 (unauthenticated — expected)
  ✅ Calendar Events API: HTTP 401 (unauthenticated — expected)
  ✅ History API: HTTP 401 (unauthenticated — expected)
  ✅ Settings API: HTTP 401 (unauthenticated — expected)
  ✅ Timetable API: HTTP 401 (unauthenticated — expected)
  ✅ Auth CSRF endpoint: HTTP 200
  ✅ Reminders Process (GET): HTTP 200
  ✅ Reminders Process (POST): HTTP 200
Results: 10 passed, 0 failed
✅ All smoke checks passed. Ready for release.
```

> **If any check fails:** see [Troubleshooting](#troubleshooting) below. Do NOT invite users until all pass.

---

## Launch Day Sequence

### Step 1 — Confirm environment

```powershell
cd D:\personal\Code\projects\EduScheduleAI
# Quick env sanity check (should print nothing = all good):
node -e "
const v = require('dotenv').config;
const e = process.env;
const keys = ['DATABASE_URL','AUTH_SECRET','AUTH_MICROSOFT_CLIENT_ID','AUTH_MICROSOFT_CLIENT_SECRET','AGENT_API_KEY'];
keys.forEach(k => { if (!e[k]) console.error('MISSING:', k); else console.log('OK:', k); });
"
```

Or simply check the .env file:

```powershell
Get-Content .env | Select-String "^[A-Z]"
```

Confirm all 5 keys are set and not placeholders:
- `DATABASE_URL` — must start with `file:./` (dev) or `postgresql://` (prod)
- `AUTH_SECRET` — must be a long hex string, not a placeholder
- `AUTH_MICROSOFT_CLIENT_ID` — Azure App ID (GUID format)
- `AUTH_MICROSOFT_CLIENT_SECRET` — Azure secret
- `AGENT_API_KEY` — OpenAI sk-proj- key

### Step 2 — Start the production server

```powershell
cd D:\personal\Code\projects\EduScheduleAI
npm run build   # skip if already built today
npm run start
```

Server ready when you see:
```
▲ Next.js X.X.X
- Local: http://localhost:3000
```

### Step 3 — Run smoke check (final confirmation)

```powershell
# In a SECOND terminal:
cd D:\personal\Code\projects\EduScheduleAI
npm run smoke:prod
```

Must see: `✅ All smoke checks passed. Ready for release.`

### Step 4 — Test your own login (critical)

1. Open `http://localhost:3000/login` (or your production URL)
2. Click "Sign in with Microsoft"
3. Use your university Outlook account
4. Confirm you land on `/dashboard`
5. Add a test timetable entry → confirm it saves (Timetable tab)
6. Run email scan → confirm it loads without error (Email tab)

### Step 5 — Send Wave 1 invites

Wave 1 = 2 users (closest contacts). Use templates from `WAVE1_INVITE_ASSETS.md`.

Send the **Launch Day Onboarding DM** to each user.

```
App URL: http://[YOUR-DOMAIN]/login
```

Record in tracking sheet: Name | Invited D0

### Step 6 — Monitor for first 2 hours

Check for errors every 30 minutes:

```powershell
# Check reminder processor (should return metrics JSON):
Invoke-RestMethod -Uri "http://localhost:3000/api/reminders/process" -Method GET

# Check auth endpoint (should return { csrfToken: "..." }):
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/csrf" -Method GET
```

Watch for 500 responses — those need immediate attention.

---

## Day +1 — Wave 2 Trigger (if Wave 1 clean)

**Criteria to proceed:** Wave 1 users logged in successfully, no 500 errors in logs.

```powershell
# Spot-check DB for any stuck reminders:
npx prisma studio
# OR direct query:
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.reminder.findMany({ where: { status: 'PROCESSING' } }).then(r => {
  console.log('STUCK PROCESSING:', r.length);
  p.$disconnect();
});
"
```

If `STUCK PROCESSING` count is non-zero, trigger a manual process run:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/reminders/process" -Method POST -ContentType "application/json"
```

If Wave 1 clean → send Wave 2 invites (4 users, templates A2–A5 from `WAVE1_INVITE_ASSETS.md`).

---

## Reminder Processor — Manual Run

Reminders are normally triggered by cron or Vercel Cron. To run manually:

**Without CRON_SECRET (dev mode):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/reminders/process" -Method POST
```

**With CRON_SECRET set:**
```powershell
$secret = $env:CRON_SECRET
Invoke-RestMethod -Uri "http://localhost:3000/api/reminders/process" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $secret" }
```

Expected response:
```json
{ "processed": N, "sent": N, "failed": 0, "skipped": N, "durationMs": N }
```

---

## Troubleshooting

### Smoke check fails: ENV check

```powershell
# See which vars are missing:
Get-Content .env
```
Fill in the missing values. All 5 required keys must be non-placeholder.

### Smoke check fails: DB connectivity

```powershell
# Reset dev DB (CAUTION: wipes data):
npx prisma db push --force-reset
npx prisma db seed
```

### Smoke check fails: API routes return 5xx

```powershell
# Check server logs in the terminal running `npm start`
# Common cause: server not running — restart it:
npm run start
```

### Login redirects but doesn't return

- Verify `AUTH_MICROSOFT_CLIENT_ID` and `AUTH_MICROSOFT_CLIENT_SECRET` in Azure Portal
- Check redirect URI in Azure App Registration matches your domain exactly
- Review NextAuth logs in server console

### `db:generate` fails (Windows DLL lock)

```powershell
# Stop server first (Ctrl+C), then:
npx prisma generate
# Restart server after:
npm run start
```

### Reminder stuck in PROCESSING state

```powershell
# Force a process run to clear stuck reminders:
Invoke-RestMethod -Uri "http://localhost:3000/api/reminders/process" -Method POST
```

---

## Production Deployment (Vercel / Render / VPS)

If deploying to a cloud platform instead of local:

```powershell
# 1. Build
npm run build

# 2. Set environment variables in platform dashboard (not .env):
#    DATABASE_URL = postgresql://...
#    AUTH_SECRET  = (same as local or re-generated)
#    AUTH_MICROSOFT_CLIENT_ID / SECRET / TENANT_ID
#    AGENT_API_KEY
#    CRON_SECRET = (generate: openssl rand -hex 32)

# 3. Set AUTH_MICROSOFT_TENANT_ID to your university tenant (not "common")

# 4. After deploy, run smoke against production:
npm run smoke -- --base-url https://your-domain.com

# 5. Tag the release:
git tag v0.2.0-beta.1
git push origin v0.2.0-beta.1
```

---

## Known Caveats (Operator Awareness)

| Item | Impact | Action |
|------|--------|--------|
| `db:generate` blocked on Windows while server runs | Low — dev only | Stop server, generate, restart |
| `CRON_SECRET` not set | Medium — process endpoint is open | Set before internet-facing deploy |
| `AUTH_MICROSOFT_TENANT_ID=common` | Low — allows all MS accounts | Change to university tenant before public launch |
| Email digest delivery not wired | Low for beta | Reminders appear in-app only; tell users up front |
| Calendar write-back is local only | Low for beta | Changes don't push to Outlook Calendar yet |
| `/emails` route is a stub in prod | Cosmetic | Not in dashboard nav; users won't see it |
