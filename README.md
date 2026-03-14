# EduSchedule AI

Local-first academic schedule assistant for students.

This repo is the practical prototype version of the original 1-week MVP plan. The current implementation focuses on a **demo-ready local workflow**: dashboard access, timetable import, calendar views, email review flow, basic AI/chat actions, history/undo, settings, and export.

## Current state

The app is currently strongest as a **local demo build**.

What is working well now:
- local dashboard and seeded demo student flow
- timetable data persistence and calendar rendering
- email review queue and approval/dismiss flow
- history view and undo support for reversible changes
- settings page and local preference persistence
- ICS export route
- dev/demo auth bypass for fast testing without Microsoft setup

What is still partial / scaffolded:
- real Microsoft sign-in and full Graph account linking
- real Outlook inbox/calendar sync in production conditions
- production deployment verification on Vercel
- full end-to-end live cloud flow

---

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma**
- **SQLite** for local demo data
- **NextAuth v5 beta**
- **Microsoft Graph SDK / MSAL**
- **Tailwind CSS**
- **FullCalendar**
- **Vercel AI SDK**
- **Zod**

---

## Project structure

```text
EduScheduleAI/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── calendar/
│   │   ├── emails/
│   │   └── timetable/
│   ├── components/
│   └── lib/
├── .env.example
├── auth.ts
├── middleware.ts
└── README.md
```

---

## Main app areas

### Dashboard
- overview / quick stats
- timetable page
- calendar page
- email review page
- history / changes pages
- chat page
- settings page

### API routes
- `GET/POST /api/calendar/events`
- `GET /api/calendar/events/ics`
- `POST /api/emails/scan`
- `GET /api/history`
- `POST /api/history/[changeId]/undo`
- `POST /api/history/[changeId]/review`
- `GET/PUT /api/settings`
- `GET/POST /api/timetable`
- `POST /api/chat`
- `api/auth/[...nextauth]`

---

## Local setup

### 1. Install dependencies

```bash
cd D:\personal\Code\projects\EduScheduleAI
npm install
```

### 2. Create env file

Copy `.env.example` to `.env` and adjust values.

Minimum local setup:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-string"
AUTH_MICROSOFT_CLIENT_ID="your-microsoft-client-id"
AUTH_MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
AUTH_MICROSOFT_TENANT_ID="common"
DEV_AUTH_BYPASS="true"
```

### 3. Prepare database + demo data

```bash
npm run setup:local
```

This does:
- Prisma client generation
- local schema push
- demo seed data insertion

### 4. Start the app

```bash
npm run dev
```

Open:
- `http://localhost:3000/login`
- `http://localhost:3000/dashboard`

---

## Seeded demo data

`npm run db:seed` creates a reusable demo student and starter data:
- demo student profile
- default preferences
- starter timetable
- sample calendar events
- sample email processing log
- sample applied schedule change

This is useful for:
- demos
- UI testing
- local regression checks

---

## Database commands

```bash
npm run db:generate
npm run db:push
npm run db:migrate:deploy
npm run db:seed
npm run setup:local
npm run setup:prod
```

### Notes
- `setup:local` is the fastest path for SQLite/local work.
- `setup:prod` is intended for a deployed environment with migrations available.
- For Postgres providers like Neon/Vercel Postgres, update `DATABASE_URL` accordingly.

---

## Microsoft setup

To move beyond demo mode, create a Microsoft Entra app registration and set:
- `AUTH_MICROSOFT_CLIENT_ID`
- `AUTH_MICROSOFT_CLIENT_SECRET`
- `AUTH_MICROSOFT_TENANT_ID`

Local redirect URI:
- `http://localhost:3000/api/auth/callback/microsoft-entra-id`

Production redirect URI:
- `https://your-app.vercel.app/api/auth/callback/microsoft-entra-id`

If these are missing or placeholders, the app stays in local/mock-friendly mode.

---

## Production / Vercel deployment

### Recommended flow

1. Create a Vercel project
2. Provision Postgres (Neon or Vercel Postgres)
3. Set production env vars:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_MICROSOFT_CLIENT_ID`
   - `AUTH_MICROSOFT_CLIENT_SECRET`
   - `AUTH_MICROSOFT_TENANT_ID`
4. Deploy the app
5. Run:

```bash
npm run setup:prod
```

### Important caveat

This repo was developed around a **local SQLite demo flow** first. If you switch to production Postgres, verify:
- Prisma datasource/provider compatibility
- migrations are applied successfully
- auth callbacks match deployed URL
- live Microsoft account linking works as expected

---

## Demo walkthrough script

Use this when showing the prototype.

### Demo flow

1. Open `/login`
2. Use dev/demo access path
3. Open dashboard overview
4. Show timetable page and imported classes
5. Open calendar page and review seeded upcoming events
6. Open email page and show reviewable email-derived items
7. Approve or dismiss an item
8. Open history page and show the recorded change
9. Undo a reversible change
10. Open settings and show scheduling preferences
11. Export calendar as ICS
12. Open chat and ask for today / tomorrow schedule

### Short script

- “This is EduSchedule AI, a student scheduling assistant.”
- “Right now it supports a local-first workflow so demos are stable.”
- “Students can manage timetable data, review email-derived changes, and track schedule history.”
- “The system keeps enough history to support undo and safer experimentation.”
- “The next step is promoting this from local-demo mode to fully live Microsoft-connected production mode.”

---

## Known limitations

- real Microsoft auth is not fully production-finished
- live inbox/calendar sync needs more hardening
- Prisma provider is currently configured for SQLite in local development
- deployment flow still needs final real-world verification
- some features are intentionally demo-scoped instead of fully automated

---

## Recommended next steps

1. finalize production database provider choice
2. verify migration path for Postgres
3. complete real Microsoft account linking flow
4. test live Outlook read/write in deployed environment
5. polish UI for final demo/public handoff

---

## Commands cheat sheet

```bash
# local dev
npm install
npm run setup:local
npm run dev

# quality
npm run lint
npm run build

# db
npm run db:generate
npm run db:push
npm run db:migrate:deploy
npm run db:seed
```
