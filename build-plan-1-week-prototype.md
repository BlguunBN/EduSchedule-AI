# EduSchedule AI — 1-Week Prototype Build Plan

> **Goal:** Working MVP where a student can sign in with Outlook, upload a timetable, see their calendar, have emails auto-parsed into events, and chat with an AI agent to manage their schedule — with full undo/recovery.
>
> **Stack:** Next.js 14 (App Router) · TypeScript · Prisma + PostgreSQL · NextAuth v5 · Microsoft Graph API · Vercel AI SDK · FullCalendar · Tailwind + shadcn/ui
>
> **Your weapons:** Claude Code (local agent) + Codex (background agent)

---

## Pre-Week Setup (Day 0 — Sunday Evening, ~2 hours)

### 1. Environment & Accounts

```bash
# Create the project
npx create-next-app@latest eduschedule-ai --typescript --tailwind --eslint --app --src-dir
cd eduschedule-ai

# Core dependencies
npm install next-auth@beta @auth/prisma-adapter @prisma/client prisma
npm install @microsoft/microsoft-graph-client @azure/msal-node
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
npm install ai @ai-sdk/openai zod chrono-node
npm install node-ical papaparse uuid
npm install -D @types/papaparse @types/uuid

# shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog input textarea tabs badge toast sheet scroll-area

# Prisma init
npx prisma init
```

### 2. Azure App Registration (Manual — Cannot Be Delegated)

1. Go to **portal.azure.com** → Microsoft Entra ID → App Registrations → New
2. Name: `EduSchedule AI Dev`
3. Supported account types: **Accounts in any organizational directory + personal**
4. Redirect URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
5. Under **API Permissions**, add Microsoft Graph **delegated** permissions:
   - `User.Read`
   - `Mail.Read`
   - `Calendars.ReadWrite`
   - `offline_access`
6. Under **Certificates & Secrets**, create a client secret
7. Copy: Application (client) ID, Directory (tenant) ID, Client Secret Value

### 3. Environment Variables

```env
# .env.local
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret
AZURE_AD_TENANT_ID=common
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
DATABASE_URL=postgresql://user:pass@localhost:5432/eduschedule
OPENAI_API_KEY=your_openai_key
```

### 4. Database (Docker or local)

```bash
docker run --name eduschedule-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=eduschedule -p 5432:5432 -d postgres:16
```

---

## Day 1 (Monday): Auth + Database + Project Skeleton

**Target:** User can sign in with Microsoft, see a dashboard shell, database stores accounts.

### Task 1.1 — Prisma Schema  
**Assign to: Claude Code**

Prompt:
> "Create the Prisma schema at prisma/schema.prisma for a student schedule app. Include:
> - NextAuth models (User, Account, Session, VerificationToken) per the @auth/prisma-adapter docs
> - Student model (linked to User) with fields: displayName, email, timezone, semesterStart, semesterEnd
> - Timetable model: studentId, name, uploadedAt, sourceType (ICS/CSV/IMAGE/MANUAL)
> - TimetableEntry: timetableId, subject, dayOfWeek (0-6), startTime, endTime, room, instructor, color
> - CalendarEvent: studentId, title, description, startTime, endTime, location, eventType (CLASS/EXAM/ASSIGNMENT/MEETING/PERSONAL), source (TIMETABLE/EMAIL/CHATBOT/MANUAL), outlookEventId (nullable), isAutoScheduled
> - ScheduleChange: studentId, calendarEventId, changeType (CREATE/UPDATE/DELETE/MOVE), previousData (JSON), newData (JSON), source, createdAt — for backup/undo
> - EmailProcessingLog: studentId, outlookMessageId, subject, processedAt, eventsCreated, status
> Use proper relations, indexes on frequently queried fields, and @default(now()) for timestamps."

Then run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Task 1.2 — NextAuth Configuration  
**Assign to: Claude Code**

Prompt:
> "Set up NextAuth v5 with Microsoft Entra ID provider in src/auth.ts and src/app/api/auth/[...nextauth]/route.ts. Use PrismaAdapter. Configure the Microsoft provider with authorization params requesting scopes: openid, profile, email, offline_access, User.Read, Mail.Read, Calendars.ReadWrite. Store the access_token and refresh_token in the Account model. Extend the session callback to include accessToken and userId. Create a getGraphClient helper in src/lib/microsoft-graph.ts that builds an authenticated Microsoft Graph client from the session's access token."

### Task 1.3 — App Layout Shell  
**Assign to: Codex** (background task while you work on auth)

Prompt:
> "Create the Next.js App Router layout for a student schedule app called EduSchedule AI:
> - src/app/layout.tsx — root layout with Inter font, SessionProvider
> - src/app/page.tsx — landing page with hero, features list, and 'Sign in with Microsoft' button
> - src/app/dashboard/layout.tsx — authenticated layout with sidebar navigation (Calendar, Timetable, Chat, Settings) using shadcn components and lucide-react icons
> - src/app/dashboard/page.tsx — dashboard home showing welcome message and quick stats cards
> - src/components/sidebar.tsx — collapsible sidebar with navigation links
> - src/middleware.ts — protect /dashboard/* routes, redirect unauthenticated users to /
> Use Tailwind with a clean blue/indigo academic theme. The sidebar should show the user's name and avatar from the session."

### Day 1 Checkpoint
- [ ] `npm run dev` works
- [ ] Microsoft sign-in flow completes and returns to dashboard
- [ ] User record created in PostgreSQL
- [ ] Dashboard layout renders with sidebar navigation

---

## Day 2 (Tuesday): Calendar UI + Timetable Upload

**Target:** Student sees a full weekly calendar. Can upload a timetable (ICS/CSV), and class blocks appear on the calendar.

### Task 2.1 — Calendar Page with FullCalendar  
**Assign to: Claude Code**

Prompt:
> "Create src/app/dashboard/calendar/page.tsx with FullCalendar React integration:
> - Weekly view as default, with day/week/month/list toggle
> - Load events from API route GET /api/events that queries CalendarEvent from Prisma for the authenticated user
> - Color-code events by eventType: CLASS=blue, EXAM=red, ASSIGNMENT=orange, MEETING=green, PERSONAL=gray
> - Enable drag-and-drop to move events (PATCH /api/events/[id])
> - Click event to open a detail dialog (shadcn Dialog) showing title, time, location, source badge
> - 'Add Event' button opens a creation form
> - Create the API routes: GET/POST /api/events, PATCH/DELETE /api/events/[id]
> - Every create/update/delete must also create a ScheduleChange record for undo history
> Style the calendar to match the app theme with Tailwind overrides."

### Task 2.2 — Timetable Upload System  
**Assign to: Codex** (this is a larger isolated module)

Prompt:
> "Build the timetable upload system for a Next.js student schedule app:
>
> 1. src/app/dashboard/timetable/page.tsx — Upload page with:
>    - Drag-and-drop file zone accepting .ics, .csv, .png, .jpg, .pdf
>    - Manual entry table where students can type in their class schedule
>    - Semester date picker (start/end dates)
>    - Preview table showing parsed classes before confirming
>    - 'Import to Calendar' button that creates CalendarEvent records
>
> 2. src/lib/parsers/ics-parser.ts — Parse .ics files using node-ical. Extract: summary→subject, dtstart/dtend→times, location→room, rrule→recurring day mapping
>
> 3. src/lib/parsers/csv-parser.ts — Parse CSV with PapaParse. Expected columns: Subject, Day, Start Time, End Time, Room, Instructor. Flexible header matching (case-insensitive, aliases like 'Course'='Subject')
>
> 4. src/lib/parsers/image-parser.ts — Send uploaded image to OpenAI GPT-4o vision API. Prompt: 'Extract all classes from this timetable image. Return JSON array with objects containing: subject, dayOfWeek (Monday=1...Friday=5), startTime (HH:MM 24h), endTime (HH:MM 24h), room, instructor. If you cannot determine a field, use null.' Parse the response, validate with Zod.
>
> 5. API routes: POST /api/timetable/upload (handles file + creates Timetable record), POST /api/timetable/[id]/import (creates CalendarEvent entries for each class recurring through the semester dates)
>
> 6. The import logic should: take semesterStart/End dates, for each TimetableEntry, generate CalendarEvent records for every matching weekday in the semester range, with source='TIMETABLE'
>
> Use Zod schemas for all parsed data validation."

### Task 2.3 — Manual Timetable Entry Component  
**Assign to: Claude Code** (quick task)

Prompt:
> "Create src/components/timetable-editor.tsx — an editable table component where students can manually add/edit/remove class rows. Columns: Subject, Day (dropdown Mon-Fri), Start Time, End Time, Room, Instructor. Add Row button at the bottom. Each row has a delete icon. Returns the data as TimetableEntry[] via an onChange prop. Use shadcn Input, Select, Button components."

### Day 2 Checkpoint
- [ ] Calendar page renders with weekly view
- [ ] Can manually add an event and see it on the calendar
- [ ] Upload a .ics file → preview parsed classes → import to calendar
- [ ] Upload a .csv → preview → import
- [ ] Upload an image of a timetable → GPT-4o extracts classes → preview → import
- [ ] Class events repeat across the semester weeks

---

## Day 3 (Wednesday): Email Integration + Auto-Parsing

**Target:** App reads Outlook inbox, detects academic emails, and creates calendar events automatically.

### Task 3.1 — Email Fetching Service  
**Assign to: Claude Code**

Prompt:
> "Create the email monitoring system:
>
> 1. src/lib/email/fetch-emails.ts — Function that uses Microsoft Graph client to:
>    - GET /me/messages with $filter for unread emails from the last 7 days
>    - $select: id, subject, bodyPreview, body, from, receivedDateTime
>    - $orderby: receivedDateTime desc, $top: 50
>    - Return typed array of OutlookEmail objects
>
> 2. src/lib/email/classify-email.ts — Use OpenAI GPT-4o-mini via Vercel AI SDK's generateObject() to classify each email:
>    - Schema (Zod): { isAcademic: boolean, eventType: 'EXAM'|'ASSIGNMENT'|'MEETING'|'EVENT'|'DEADLINE'|'NONE', confidence: number }
>    - System prompt should instruct: 'You are analyzing student emails. Classify whether this email contains an academic event, assignment, exam, meeting, or deadline that should be added to a student calendar. Consider emails from .edu addresses, LMS notifications (Canvas, Blackboard, Moodle), professor announcements, and university administration.'
>
> 3. src/lib/email/extract-event.ts — For emails classified as academic (confidence > 0.7), use generateObject() with a detailed schema:
>    { title: string, description: string, startDate: string (ISO), endDate: string (ISO), startTime: string (HH:MM, nullable), endTime: string (HH:MM, nullable), location: string (nullable), eventType: string, isAllDay: boolean, priority: 'HIGH'|'MEDIUM'|'LOW' }
>    Use chrono-node as a preprocessing step to extract dates from the email body and include them in the LLM context for better accuracy.
>
> 4. API route POST /api/emails/scan — Triggers a scan: fetches emails, classifies, extracts events, creates CalendarEvent records with source='EMAIL', logs to EmailProcessingLog. Deduplicates by outlookMessageId.
>
> Handle errors gracefully — if parsing fails for one email, log the error and continue with the next."

### Task 3.2 — Email Dashboard UI  
**Assign to: Codex**

Prompt:
> "Create src/app/dashboard/emails/page.tsx — Email processing dashboard:
> - 'Scan Inbox' button that calls POST /api/emails/scan and shows a loading spinner
> - Results list showing: email subject, from, date, classification badge (Exam/Assignment/Meeting/etc.), confidence score
> - For each detected event: show the extracted event details in an expandable card
> - 'Add to Calendar' / 'Dismiss' buttons for each detected event (don't auto-add in prototype — let student confirm)
> - Processing history table from EmailProcessingLog showing past scans
> - Toggle for 'Auto-add high confidence events (>90%)' stored in student preferences
> Use shadcn Card, Badge, Button, Accordion, and Switch components."

### Task 3.3 — Smart Scheduling Engine  
**Assign to: Claude Code**

Prompt:
> "Create src/lib/scheduling/find-free-slots.ts:
>
> Function findFreeSlots(studentId: string, date: Date, durationMinutes: number, preferences?: { preferMorning?: boolean, preferAfternoon?: boolean, avoidBackToBack?: boolean }):
> 1. Query all CalendarEvents for that date
> 2. Build an occupied-time map (array of {start, end} intervals)
> 3. Find gaps between 8:00 AM and 10:00 PM that are >= durationMinutes
> 4. If preferences.avoidBackToBack, add 15-min buffer around existing events
> 5. Sort slots by preference (morning first if preferMorning, etc.)
> 6. Return top 5 available TimeSlot objects: { start: Date, end: Date, score: number }
>
> Also create autoScheduleEvent(studentId, eventData, preferences):
> 1. Calls findFreeSlots for the event's target date
> 2. If slots available, picks the highest-scored slot
> 3. Creates CalendarEvent with isAutoScheduled=true
> 4. Creates ScheduleChange record
> 5. Returns the created event or null if no slots
>
> Write unit-testable pure functions where possible."

### Day 3 Checkpoint
- [ ] 'Scan Inbox' fetches real emails from the student's Outlook
- [ ] Emails are classified as academic or not, with confidence scores
- [ ] Academic emails show extracted event details (title, date, time)
- [ ] Student can approve adding a detected event to their calendar
- [ ] Events are placed in free time slots, avoiding class conflicts

---

## Day 4 (Thursday): AI Chatbot Agent

**Target:** Student can chat with an AI agent that reads their calendar and makes changes via tool calling.

### Task 4.1 — Chat Backend with Tool Calling  
**Assign to: Claude Code** (this is the most complex piece — work with it interactively)

Prompt:
> "Build the AI chatbot agent using Vercel AI SDK:
>
> 1. src/app/api/chat/route.ts — streaming chat endpoint using streamText() with tools:
>
>    Tools to define (each as a Zod-typed tool):
>    a. listEvents — params: { startDate, endDate } → queries CalendarEvent, returns summary
>    b. createEvent — params: { title, date, startTime, endTime, location, eventType } → creates CalendarEvent + ScheduleChange, syncs to Outlook via Graph API POST /me/events
>    c. moveEvent — params: { eventId, newDate?, newStartTime?, newEndTime? } → updates CalendarEvent + ScheduleChange
>    d. deleteEvent — params: { eventId } → soft-deletes CalendarEvent + ScheduleChange
>    e. findFreeTime — params: { date, durationMinutes } → calls findFreeSlots()
>    f. scanEmails — params: {} → triggers email scan, returns summary of findings
>    g. undoLastChange — params: {} → finds most recent ScheduleChange, reverses it
>
>    System prompt: 'You are EduSchedule AI, a friendly academic schedule assistant for university students. You help manage their calendar, schedule study sessions, track assignments, and keep their academic life organized. Always confirm before making changes. When suggesting times, prefer the student's free slots. Be concise and helpful. If unsure about a date/time, ask for clarification.'
>
>    Use maxSteps: 5 to allow multi-step tool execution.
>    Use experimental_toolCallStreaming for real-time tool call visibility.
>
> 2. Include the student's current day schedule in the system prompt context (fetch today's events and inject them)."

### Task 4.2 — Chat UI  
**Assign to: Codex**

Prompt:
> "Create the chat interface at src/app/dashboard/chat/page.tsx:
>
> - Use Vercel AI SDK's useChat hook connected to /api/chat
> - Full-height chat layout with message history and input at bottom
> - Message bubbles: user messages right-aligned, AI messages left-aligned
> - For tool call results, render special cards:
>   - listEvents → compact event list with colored badges
>   - createEvent/moveEvent/deleteEvent → confirmation card with event details and 'Undo' button
>   - findFreeTime → time slot cards the user can tap to select
>   - scanEmails → email results summary card
> - Suggested quick actions as chips above the input: 'What's my schedule today?', 'Find free time tomorrow', 'Scan my inbox', 'Schedule a study session'
> - Loading state shows typing indicator
> - Auto-scroll to latest message
> Use shadcn components and Tailwind. Make it feel conversational, not like a form."

### Task 4.3 — Outlook Calendar Sync  
**Assign to: Claude Code**

Prompt:
> "Create src/lib/microsoft-graph/calendar-sync.ts:
>
> 1. syncEventToOutlook(accessToken, calendarEvent): Creates/updates an event in the user's Outlook calendar via Microsoft Graph API POST/PATCH /me/events. Map our CalendarEvent fields to the Graph API event schema (subject, start/end with dateTimeTimeZone, location, body). Store the returned Outlook event ID in calendarEvent.outlookEventId.
>
> 2. deleteOutlookEvent(accessToken, outlookEventId): DELETE /me/events/{id}
>
> 3. importOutlookEvents(accessToken, studentId, startDate, endDate): GET /me/calendarView to fetch existing Outlook events, create CalendarEvent records for any that don't exist yet (match by outlookEventId to avoid duplicates).
>
> Handle token refresh errors by returning a specific error type that the UI can catch to prompt re-authentication."

### Day 4 Checkpoint
- [ ] Chat page loads with suggested quick actions
- [ ] "What's my schedule today?" returns a list of today's events
- [ ] "Schedule a study session for physics tomorrow for 2 hours" finds a free slot and creates the event
- [ ] "Move my physics study session to 3pm" updates the event
- [ ] "Undo that" reverses the last change
- [ ] Created/moved events appear on the calendar page
- [ ] Events sync to the student's actual Outlook calendar

---

## Day 5 (Friday): Backup/Recovery + Settings

**Target:** Full undo/redo system, schedule snapshots, and user preference settings.

### Task 5.1 — Backup & Recovery System  
**Assign to: Claude Code**

Prompt:
> "Build the backup and recovery system:
>
> 1. src/lib/backup/schedule-history.ts:
>    - getChangeHistory(studentId, limit=50): Returns recent ScheduleChange records with formatted descriptions ('AI chatbot created "Physics Study Session" on Mar 15')
>    - undoChange(changeId): Reads the ScheduleChange record, reverses it (if CREATE→delete event, if DELETE→recreate, if UPDATE→restore previousData), creates a new ScheduleChange with type RESTORE
>    - getScheduleSnapshot(studentId, date): Returns all CalendarEvents as they existed at a specific date by replaying changes
>    - restoreToSnapshot(studentId, date): Reverts the entire schedule to a point-in-time state
>
> 2. API routes:
>    - GET /api/history — paginated change history
>    - POST /api/history/undo/[changeId] — undo specific change
>    - POST /api/history/restore — restore to a specific date
>
> 3. src/app/dashboard/history/page.tsx:
>    - Timeline view of all schedule changes with source badges (User/Chatbot/Email/Upload)
>    - Each entry has an 'Undo' button
>    - Date picker to select a restore point
>    - 'Restore to this date' button with confirmation dialog warning this will revert all changes after that date
>    - Filter by source type
>
> Use shadcn Timeline-style layout (vertical line with cards)."

### Task 5.2 — Settings Page  
**Assign to: Codex**

Prompt:
> "Create src/app/dashboard/settings/page.tsx with tabs:
>
> 1. Profile tab: Display name, email (from Microsoft), timezone selector, semester start/end date pickers
>
> 2. Scheduling Preferences tab:
>    - Preferred study times (morning/afternoon/evening checkboxes)
>    - Minimum break between events (15/30/45/60 min slider)
>    - Auto-schedule confidence threshold (slider 50-100%)
>    - Avoid back-to-back classes toggle
>    - Daily schedule start/end time pickers (default 8am-10pm)
>
> 3. Email Monitoring tab:
>    - Enable/disable auto-scanning toggle
>    - Scan frequency dropdown (manual only / every hour / every 6 hours / daily)
>    - Email domains to watch (e.g., university.edu)
>    - Auto-add threshold (slider for confidence level)
>    - Sender whitelist text area
>
> 4. Data & Privacy tab:
>    - Export schedule as ICS button
>    - Export all data as JSON button
>    - Clear all data button (with confirmation)
>    - View change history link
>
> Store preferences in a StudentPreferences model (create it if it doesn't exist). API route: GET/PUT /api/settings."

### Task 5.3 — ICS Export  
**Assign to: Claude Code** (quick task)

Prompt:
> "Create src/lib/export/ics-export.ts — Function that takes an array of CalendarEvent objects and generates a valid .ics file string. Include VCALENDAR header, VTIMEZONE, and VEVENT for each event with DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION, UID. API route: GET /api/export/ics — returns the file with Content-Type: text/calendar and Content-Disposition: attachment."

### Day 5 Checkpoint
- [ ] Change history page shows all modifications with timestamps and sources
- [ ] Can undo any individual change
- [ ] Can restore schedule to a past date
- [ ] Settings page saves and loads preferences
- [ ] Export schedule as .ics downloads a valid calendar file

---

## Day 6 (Saturday): Polish, Testing & Integration

**Target:** Everything works end-to-end. UI is polished. Edge cases handled.

### Task 6.1 — End-to-End Flow Testing  
**Do this yourself — test the full student journey:**

```
1. Sign in with Microsoft → Dashboard
2. Upload a timetable image → Preview → Import → Classes appear on calendar
3. Scan inbox → See detected academic emails → Approve events → Events on calendar
4. Open chat → "What's my schedule tomorrow?" → Get response
5. Chat: "Schedule a 2-hour study session for math tomorrow" → Event created in free slot
6. Chat: "Move it to 4pm" → Event moved
7. Chat: "Undo that" → Event back to original time
8. Check History page → See all changes
9. Undo a change from history → Calendar reflects the reversal
10. Check Outlook calendar → Events synced
11. Export as ICS → Open in another calendar app
```

### Task 6.2 — UI Polish  
**Assign to: Codex**

Prompt:
> "Polish the EduSchedule AI webapp:
> 1. Add a proper loading skeleton for the calendar page
> 2. Add toast notifications (shadcn Toast) for: event created, event moved, event deleted, email scan complete, undo successful, sync to Outlook complete
> 3. Add empty states for: no events on calendar ('Your schedule is clear! Upload a timetable or scan your inbox'), no chat history ('Start by asking about your schedule'), no email results
> 4. Add responsive design: sidebar collapses to a hamburger menu on mobile, calendar switches to list view on small screens, chat is full-screen on mobile
> 5. Add a dashboard home page (src/app/dashboard/page.tsx) with: today's schedule summary card, upcoming exams/deadlines card, 'Quick Actions' buttons (Upload Timetable, Scan Inbox, Open Chat), stats (total events this week, auto-scheduled events, emails processed)
> 6. Add keyboard shortcut: Cmd+K opens a command palette (simple search dialog) to quickly navigate or create events"

### Task 6.3 — Error Handling & Edge Cases  
**Assign to: Claude Code**

Prompt:
> "Add comprehensive error handling across the app:
> 1. Token refresh: If any Microsoft Graph API call returns 401, attempt to refresh the access token using the stored refresh_token via MSAL. If refresh fails, redirect to re-authenticate with a toast message.
> 2. Rate limiting: Graph API has throttling. Add exponential backoff retry (3 attempts) in the Graph client wrapper.
> 3. Chat errors: If an AI tool call fails, the chatbot should explain the error conversationally ('I couldn't access your calendar right now, let me try again') and retry once.
> 4. File upload: Validate file size (<10MB), file type, and show clear error messages.
> 5. Concurrent edits: Add optimistic locking with a version field on CalendarEvent. If a stale update is detected, show a toast 'This event was modified. Please refresh.'
> 6. Add a global error boundary component wrapping the dashboard layout.
> 7. Add API route error responses as consistent JSON: { error: string, code: string }"

### Day 6 Checkpoint
- [ ] Full end-to-end flow works without errors
- [ ] Toast notifications appear for all actions
- [ ] Mobile layout is usable
- [ ] Token refresh works silently
- [ ] Upload errors show helpful messages
- [ ] Dashboard home page shows useful summary

---

## Day 7 (Sunday): Demo-Ready + Deploy

**Target:** Deployed prototype accessible via URL. Demo script ready.

### Task 7.1 — Deploy to Vercel  
**Do this yourself:**

```bash
# Install Vercel CLI
npm i -g vercel

# Set up Vercel project
vercel

# Add environment variables in Vercel dashboard:
# AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
# NEXTAUTH_SECRET, DATABASE_URL (use Vercel Postgres or Neon), OPENAI_API_KEY
# NEXTAUTH_URL = your-app.vercel.app

# Deploy
vercel --prod
```

Update Azure App Registration redirect URI to include: `https://your-app.vercel.app/api/auth/callback/microsoft-entra-id`

### Task 7.2 — Database Migration for Production  
**Assign to: Claude Code**

Prompt:
> "Set up Vercel Postgres (or Neon) for production:
> 1. Create a setup script that runs prisma migrate deploy
> 2. Add a seed script (prisma/seed.ts) that creates a demo student with sample timetable data and some pre-created events for demo purposes
> 3. Ensure all Prisma queries use connection pooling appropriate for serverless (add ?pgbouncer=true to DATABASE_URL if using Neon)"

### Task 7.3 — README & Demo Script  
**Assign to: Codex**

Prompt:
> "Create a comprehensive README.md for EduSchedule AI:
> - App description and key features
> - Screenshots placeholder section
> - Tech stack with all libraries listed
> - Setup instructions (Azure app registration, env vars, database, npm install, dev server)
> - Architecture overview: which component does what
> - API routes documentation table
> - Demo walkthrough script (step-by-step what to show in a demo)
> - Known limitations and future roadmap
> - Contributing guide basics"

### Day 7 Checkpoint
- [ ] App deployed and accessible at a public URL
- [ ] Can sign in from the deployed version
- [ ] Full demo flow works on production
- [ ] README documents setup and usage
- [ ] Seed data available for demos

---

## Claude Code & Codex Strategy Guide

### How to Use Claude Code Effectively

Claude Code is your **primary coding partner** for interactive, complex tasks. Use it for:

```bash
# Start Claude Code in your project directory
claude

# Example prompts for this project:
> "Look at the current codebase and implement the Microsoft Graph email fetching service. Check the existing auth setup to understand how to get the access token."

> "The calendar isn't showing events from the timetable import. Debug the issue — check the API route, the Prisma query, and the FullCalendar event format."

> "Refactor the chat tools to include error handling and add the undoLastChange tool. Look at how other tools are implemented for consistency."
```

**Best practices with Claude Code:**
- Let it read your existing code first before writing new code
- Ask it to run `npm run build` after changes to catch TypeScript errors
- Use it for debugging — paste the error, let it trace through the code
- Have it write and run tests for critical functions (scheduling engine, parsers)

### How to Use Codex Effectively

Codex is your **background task runner** for well-defined, isolated features. Use it for:

- UI pages with clear specs (give it the full component description)
- Utility functions with clear input/output contracts
- CSS/styling polish tasks
- Documentation and README generation

**Codex task format that works best:**
```
Task: [Clear one-line description]
Files to create/modify: [Explicit list]
Dependencies available: [List what's installed]
Existing patterns to follow: [Point to existing similar file]
Acceptance criteria:
- [ ] Specific testable outcome 1
- [ ] Specific testable outcome 2
```

### Parallel Task Assignment Strategy

| Time Block | You | Claude Code | Codex |
|-----------|-----|-------------|-------|
| Day 1 AM | Azure setup + env | Prisma schema + migrations | App layout shell |
| Day 1 PM | Test auth flow | NextAuth config | — review Codex output |
| Day 2 AM | Review calendar UI | FullCalendar integration | Timetable upload system |
| Day 2 PM | Test uploads | Timetable editor component | — |
| Day 3 AM | Review email flow | Email fetch + classify + extract | Email dashboard UI |
| Day 3 PM | Test email scan | Scheduling engine | — review Codex output |
| Day 4 AM | Test chat tools | Chat backend + tools | Chat UI |
| Day 4 PM | Integration testing | Outlook calendar sync | — |
| Day 5 AM | Test backup system | Backup & recovery system | Settings page |
| Day 5 PM | Test settings | ICS export | — |
| Day 6 ALL | E2E testing + fixes | Error handling + edge cases | UI polish |
| Day 7 AM | Deploy to Vercel | Production DB setup | README |
| Day 7 PM | Demo rehearsal | Bug fixes | — |

---

## File Structure (Target End State)

```
eduschedule-ai/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── chat/route.ts
│   │   │   ├── emails/scan/route.ts
│   │   │   ├── events/route.ts          # GET, POST
│   │   │   ├── events/[id]/route.ts     # PATCH, DELETE
│   │   │   ├── export/ics/route.ts
│   │   │   ├── history/route.ts
│   │   │   ├── history/undo/[id]/route.ts
│   │   │   ├── history/restore/route.ts
│   │   │   ├── settings/route.ts
│   │   │   └── timetable/
│   │   │       ├── upload/route.ts
│   │   │       └── [id]/import/route.ts
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # Dashboard home
│   │   │   ├── calendar/page.tsx
│   │   │   ├── chat/page.tsx
│   │   │   ├── emails/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── timetable/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # Landing page
│   │   └── globals.css
│   ├── auth.ts
│   ├── middleware.ts
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── timetable-editor.tsx
│   │   ├── chat-message.tsx
│   │   ├── event-card.tsx
│   │   ├── email-result-card.tsx
│   │   └── ui/                          # shadcn components
│   └── lib/
│       ├── prisma.ts                    # Prisma client singleton
│       ├── microsoft-graph.ts           # Graph client helper
│       ├── backup/
│       │   └── schedule-history.ts
│       ├── email/
│       │   ├── fetch-emails.ts
│       │   ├── classify-email.ts
│       │   └── extract-event.ts
│       ├── export/
│       │   └── ics-export.ts
│       ├── microsoft-graph/
│       │   └── calendar-sync.ts
│       ├── parsers/
│       │   ├── ics-parser.ts
│       │   ├── csv-parser.ts
│       │   └── image-parser.ts
│       └── scheduling/
│           └── find-free-slots.ts
├── .env.local
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

---

## MVP Scope Cuts (What to Skip in Week 1)

To ship in 7 days, intentionally skip these for v2:

- **Real-time webhooks** for email monitoring — use manual "Scan" button + optional polling instead
- **Recurring event editing** (edit all future instances) — just edit individual events
- **Multi-calendar support** — single Outlook calendar only
- **Collaborative features** — single student only
- **Push notifications** — no mobile push, just in-app toasts
- **Advanced conflict resolution** — simple "no overlap" logic only
- **Timetable OCR offline fallback** — GPT-4o Vision only, skip Tesseract.js
- **Rate limiting / abuse prevention** — not needed for prototype
- **i18n / localization** — English only
- **Automated testing suite** — manual testing only for prototype

---

## Cost Estimate for Prototype Phase

| Service | Cost | Notes |
|---------|------|-------|
| OpenAI API (GPT-4o-mini for chat + classification) | ~$2-5 | Low volume during dev |
| OpenAI API (GPT-4o Vision for timetable images) | ~$1-3 | Few image uploads |
| Vercel (Hobby tier) | Free | Sufficient for prototype |
| Vercel Postgres / Neon | Free tier | 256MB storage, enough for prototype |
| Azure AD App Registration | Free | No cost for app registrations |
| **Total estimated** | **~$3-8** | For the entire prototype week |
