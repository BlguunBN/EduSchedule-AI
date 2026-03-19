# Production Environment Checklist

Use this before every production deploy. Complete all items or document why they're intentionally skipped.

---

## ✅ Required Environment Variables

| Variable | Where to get it | Notes |
|---|---|---|
| `DATABASE_URL` | Your DB provider | PostgreSQL URL for production; include `?sslmode=require` |
| `AUTH_SECRET` | `openssl rand -hex 32` | Min 32 chars. Never reuse across environments. |
| `AUTH_MICROSOFT_CLIENT_ID` | Azure Portal → App registrations | Must be a real Azure App ID |
| `AUTH_MICROSOFT_CLIENT_SECRET` | Azure Portal → Certificates & secrets | Rotate on compromise |
| `AUTH_MICROSOFT_TENANT_ID` | Azure Portal or university IT | University tenant ID, not "common" |
| `AGENT_API_KEY` | OpenAI / your LLM provider | Used for chat and email analysis |

## ⛔ Variables that MUST be absent or `false` in production

| Variable | Required value |
|---|---|
| `DEV_AUTH_BYPASS` | `false` or absent |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `false` or absent |

The server will **throw and refuse to start** if these are `true` in production.

## ⚠️ Optional but Recommended

| Variable | Purpose | Default |
|---|---|---|
| `AUTH_MICROSOFT_TENANT_ID` | Restrict sign-in to your university tenant | `common` (all Microsoft accounts) |

---

## Validation

Run at any time to check your environment:

```bash
npm run smoke
```

Or check just env vars:

```bash
node -e "require('./src/lib/env-validation').logEnvStatus()"
```
