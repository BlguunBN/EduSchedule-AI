# Beta Rollout Plan — First 10 Students

**Phase C · Beta cohort 1**
**Target date:** TBD (set before inviting anyone)
**Cohort size:** 10 students

---

## Goals

- Validate core flow: sign-in → timetable import → email scan → reminders
- Catch UX friction before a wider launch
- Gather structured feedback within 7 days of onboarding

---

## Pre-launch (before inviting users)

- [ ] Production env fully configured (see `PRODUCTION_ENV_CHECKLIST.md`)
- [ ] `npm run prerelease:check` passes cleanly
- [ ] Microsoft Entra ID app registered; redirect URI set to production domain
- [ ] At least one test account end-to-end tested (sign-in → dashboard → timetable save)
- [ ] Reminder processor job scheduled (cron or Vercel cron)
- [ ] Incident response contacts documented (see `INCIDENT_RESPONSE_PLAYBOOK.md`)
- [ ] Onboarding script ready (see `USER_ONBOARDING_SCRIPT.md`)

---

## Cohort selection

**Target profile:** CS/tech students at your university who:
- Use Outlook daily
- Have a variable class schedule (labs, tutorials, seminars)
- Are comfortable with "beta" software

**Recruitment:** Personal invite. Do not post publicly for this cohort.

---

## Invite cadence

| Day | Action |
|-----|--------|
| D-3 | Send welcome message with expectations (see Onboarding Script) |
| D0  | Share sign-in link; confirm they can log in |
| D+1 | Follow up: have they added their timetable? |
| D+3 | Check-in: email scan working? Any issues? |
| D+7 | Feedback form or 5-min call |

---

## Staged rollout

Don't invite all 10 at once. Stagger to catch issues early:

1. **Wave 1 (days 1–2):** 2 users — close contacts, high trust
2. **Wave 2 (days 3–4):** 4 users — if wave 1 has no blockers
3. **Wave 3 (days 5–7):** remaining 4 users

If wave 1 hits a critical bug, pause and fix before wave 2.

---

## Success criteria (after 7 days)

- ≥ 8/10 users successfully completed timetable import
- ≥ 6/10 ran at least one email scan
- 0 auth failures in production logs
- Reminder delivery rate ≥ 90% (check DB: `status = 'SENT'`)
- No user-reported data loss

---

## Post-cohort

- Collect feedback (Google Form or direct message)
- Triage issues into: bug / UX friction / feature request
- Decide: open cohort 2 or fix first?
