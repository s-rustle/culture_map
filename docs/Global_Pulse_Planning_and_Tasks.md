# Global Pulse — Planning + Task Setting
## Spec Kit Phases 4 & 5

---

## 4. PLANNING — Architecture & Technology Decisions

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Next.js 14)                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Dashboard UI │  │  Chat / Ask  │  │  Email Preview/Approve│  │
│  │  (React)      │  │  Interface   │  │  Queue                │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                 │                      │               │
│  ┌──────┴─────────────────┴──────────────────────┴────────────┐  │
│  │                    API Routes (Next.js)                     │  │
│  │  /api/agent    /api/scan    /api/email    /api/auth         │  │
│  └──────────────────────┬─────────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────┴─────────────────────────────────────┐  │
│  │              LangChain Agent (Python via API route)         │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │  │
│  │  │ Tool 1  │ │ Tool 2   │ │ Tool 3    │ │ Tool 4       │  │  │
│  │  │ Roster  │ │ Weather  │ │ News/     │ │ Email Draft  │  │  │
│  │  │ Lookup  │ │ Monitor  │ │ Events    │ │ + Send       │  │  │
│  │  └────┬────┘ └────┬─────┘ └─────┬─────┘ └──────┬───────┘  │  │
│  │       │           │             │               │           │  │
│  │  Local JSON   External APIs  External APIs   Resend API    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────┴─────────────────────────────────────┐  │
│  │                  Vercel Postgres (Neon)                     │  │
│  │  situations │ notifications │ scan_history │ sessions       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Vercel Cron Jobs                               │  │
│  │  Every 4hr: scan priority countries                         │  │
│  │  Daily 06:00 CT: morning briefing compile                   │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architecture Decision: Python Agent in Next.js

LangChain requires Python. On Vercel, we have two viable approaches:

**Option A — Vercel Python Runtime (Recommended for sprint)**
Vercel supports Python API routes natively via `api/` directory with `.py` files. The LangChain agent lives as a Python serverless function. Frontend is Next.js/React. They communicate via internal API calls.

**Option B — Separate FastAPI backend**
Deploy the LangChain agent as a standalone FastAPI service (e.g., on Railway or Render free tier). Next.js frontend calls it as an external API. More production-appropriate but adds deployment complexity.

**Decision: Option A** for speed. The agent logic lives in Vercel Python API routes. If Vercel's Python runtime introduces friction, we fall back to Option B.

---

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14, React, Tailwind CSS | Overclock standard stack; Vercel-native |
| **UI Components** | shadcn/ui + Lucide React icons | Clean, accessible; brand-customizable |
| **Agent Framework** | LangChain (Python) | Sprint requirement |
| **LLM** | Claude (Anthropic SDK via LangChain) | Existing API key; strong reasoning |
| **Database** | Vercel Postgres (Neon) | Free tier; serverless; Vercel-native |
| **Email** | Resend | Free tier (100/day); React email templates; inline images |
| **Screenshot Rendering** | @vercel/og (Satori) | Serverless-compatible; no Puppeteer needed; generates PNG from JSX |
| **Weather API** | WeatherAPI.com | 1M calls/month free; better alert data than OpenWeatherMap free tier |
| **News API** | NewsAPI.org + GDELT | NewsAPI for headlines; GDELT for real-time event detection |
| **Auth** | Simple password middleware | Shared password; cookie-based session |
| **Cron** | Vercel Cron Jobs | Free on Hobby plan; triggers API routes on schedule |
| **Font** | Inter (Google Fonts) | Web-safe substitute for FK Grotesk / Decagram per brand guidelines |

---

### Database Schema

```sql
-- Situations: active/historical events being tracked
CREATE TABLE situations (
  id            SERIAL PRIMARY KEY,
  country_code  VARCHAR(2) NOT NULL,
  country       VARCHAR(100) NOT NULL,
  region        VARCHAR(200),
  city          VARCHAR(200),
  event_type    VARCHAR(50) NOT NULL,        -- weather, political, conflict, celebration, infrastructure, public_health
  severity      VARCHAR(10) NOT NULL,         -- low, moderate, high, critical
  title         VARCHAR(500) NOT NULL,
  summary       TEXT NOT NULL,
  source_url    TEXT,
  source_name   VARCHAR(200),
  infrastructure_impact TEXT,                 -- power, internet, transport
  affected_consultant_count INTEGER DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'active', -- active, monitoring, resolved
  first_detected_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  last_checked_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at        TIMESTAMP,
  previous_severity  VARCHAR(10),             -- for escalation detection
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Notifications: email drafts, approvals, and send history
CREATE TABLE notifications (
  id            SERIAL PRIMARY KEY,
  situation_id  INTEGER REFERENCES situations(id),
  recipient_type VARCHAR(20) NOT NULL,        -- consultant, team_lead, coach, team_lead_priority
  recipient_email VARCHAR(300),
  recipient_name  VARCHAR(200),
  email_type    VARCHAR(30) NOT NULL,         -- check_in, team_notify, escalation, all_clear, briefing
  subject       VARCHAR(500) NOT NULL,
  body_html     TEXT NOT NULL,
  screenshot_url TEXT,                        -- URL to rendered dashboard screenshot
  status        VARCHAR(20) DEFAULT 'draft',  -- draft, approved, sent, dismissed, failed
  approved_by   VARCHAR(100),                 -- coach name
  approved_at   TIMESTAMP,
  sent_at       TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Scan history: audit trail of automated scans
CREATE TABLE scan_history (
  id            SERIAL PRIMARY KEY,
  scan_type     VARCHAR(30) NOT NULL,         -- scheduled_4hr, daily_briefing, manual, escalation_recheck
  countries_scanned TEXT,                     -- JSON array of country codes
  situations_found  INTEGER DEFAULT 0,
  escalations_found INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Sessions: simple auth sessions
CREATE TABLE sessions (
  id            VARCHAR(64) PRIMARY KEY,      -- random token
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP NOT NULL
);
```

---

### API Route Structure

```
/api/
├── auth/
│   ├── login.py          POST — validate password, set session cookie
│   └── logout.py         POST — clear session
│
├── agent/
│   └── chat.py           POST — send message to LangChain agent, get response
│                          Body: { message: string, conversation_id?: string }
│                          Returns: { response: string, situations?: [], actions?: [] }
│
├── scan/
│   ├── run.py            POST — trigger a scan (manual or cron-invoked)
│   │                     Body: { scope: "all" | "country", countries?: string[] }
│   ├── status.py         GET  — current scan status, last run time
│   └── history.py        GET  — scan audit log
│
├── situations/
│   ├── active.py         GET  — all active situations, sorted by severity
│   ├── [id].py           GET  — single situation detail
│   └── resolve.py        POST — mark situation as resolved
│
├── notifications/
│   ├── queue.py          GET  — pending drafts awaiting approval
│   ├── approve.py        POST — approve a notification (triggers send)
│   ├── dismiss.py        POST — dismiss a notification
│   ├── edit.py           PUT  — edit a draft before approval
│   └── history.py        GET  — sent notification log
│
├── email/
│   └── send.py           POST — internal: Resend API call (called by approve flow)
│
├── screenshot/
│   └── render.py         GET  — renders a situation card or briefing as PNG via @vercel/og
│
├── roster/
│   ├── by-country.py     GET  — consultants in a given country/region
│   ├── by-coach.py       GET  — consultants assigned to a coach
│   └── affected.py       GET  — consultants in areas with active situations
│
├── briefing/
│   └── morning.py        GET  — compiled morning briefing data
│
└── cron/
    ├── scan-priority.py  GET  — Vercel Cron handler: 4-hour scan (secured by CRON_SECRET)
    └── daily-briefing.py GET  — Vercel Cron handler: morning briefing (secured by CRON_SECRET)
```

---

### Frontend Component Architecture

```
app/
├── layout.tsx                    — Root layout: Inter font, brand colors, auth check
├── login/
│   └── page.tsx                  — Password login screen
├── dashboard/
│   ├── page.tsx                  — Main dashboard: global overview
│   ├── components/
│   │   ├── GlobalMap.tsx         — World map with severity pins on consultant locations
│   │   ├── SituationCard.tsx     — Individual situation: severity, summary, affected count, actions
│   │   ├── SituationList.tsx     — Sorted list of active situations
│   │   ├── SeverityBadge.tsx     — 🟢🟡🟠🔴 with brand colors
│   │   ├── CountryOverview.tsx   — Drill-down: single country detail
│   │   ├── AffectedRoster.tsx    — Table of consultants in affected area
│   │   └── StatsBar.tsx          — Top-level metrics: countries monitored, active alerts, consultants affected
│   │
│   ├── briefing/
│   │   └── page.tsx              — Morning briefing view (all situations synthesized)
│   │
│   ├── notifications/
│   │   ├── page.tsx              — Email approval queue
│   │   └── components/
│   │       ├── EmailPreview.tsx  — Rendered email with dashboard screenshot preview
│   │       ├── ApprovalActions.tsx — Approve / Edit / Dismiss buttons
│   │       └── NotificationHistory.tsx — Sent email log
│   │
│   └── ask/
│       ├── page.tsx              — Chat interface: ask the agent questions
│       └── components/
│           ├── ChatWindow.tsx    — Message thread
│           ├── ChatInput.tsx     — Text input + send
│           └── AgentResponse.tsx — Formatted agent response with situation cards inline
│
├── components/
│   ├── AppShell.tsx              — Sidebar nav + header (brand: dark nav, light content)
│   ├── PasswordGate.tsx          — Auth middleware component
│   └── BrandLogo.tsx             — Lumenalta icon (if permitted) or "Global Pulse" wordmark
│
└── lib/
    ├── api.ts                    — Fetch wrappers for all API routes
    ├── types.ts                  — TypeScript interfaces for situations, notifications, roster
    ├── colors.ts                 — Brand color constants
    ├── severity.ts               — Severity level utilities (labels, colors, sort order)
    └── timezone.ts               — Timezone-aware formatting utilities
```

---

### Data Files (Static / Local)

```
data/
├── roster.json                   — 600 synthetic consultant records
├── known-events.json             — Ongoing conflicts, seasonal events, infrastructure concerns
├── coaches.json                  — 11 coach profiles (name, email, regions covered)
└── holidays.json                 — Major operational-impact holidays by country (Carnival, etc.)
```

---

### Rate Limit Strategy (Free Tier APIs)

| API | Free Limit | Usage Pattern | Budget |
|---|---|---|---|
| WeatherAPI.com | 1M calls/month | 19 countries × ~5 cities each × 6 scans/day = ~570/day | Well within limit |
| NewsAPI.org | 100 requests/day | 19 countries × 1 request each × 2 scans/day = ~38/day | Fine; supplement with GDELT |
| GDELT | Unlimited | Use for real-time event detection; NewsAPI for curated headlines | No concern |
| Resend | 100 emails/day | Normal ops: 5-20 emails/day; surge during crisis: ~50 | Sufficient |
| Claude API | Pay-per-use | Agent calls: ~50-100/day at conversational + cron | Manageable |
| Vercel Postgres | 256MB free | Situations + notifications + scan history | Plenty |

---

### Screenshot Rendering Strategy

**Approach: @vercel/og (Satori)**

Satori renders JSX to SVG, then to PNG — entirely serverless, no browser needed. This is the recommended approach on Vercel because it works in Edge Runtime without Puppeteer.

The `/api/screenshot/render.py` route (or a Next.js OG Image route) takes a situation ID or briefing type, renders the corresponding dashboard component as an image, and returns it as a PNG. This PNG is then embedded in the Resend email.

**Trade-off:** Satori supports a subset of CSS (flexbox, basic styling). Complex dashboard components may need a simplified "email card" variant optimized for Satori rendering. This is acceptable — the email screenshot is a summary card, not a pixel-perfect dashboard replica.

---

## 5. TASK SETTING — Implementation Tasks

Tasks are organized into phases. Tasks within a phase marked with **(P)** can be executed in parallel. Phases must be completed sequentially.

### PHASE 1: Foundation (Project Setup + Auth + Data)

- [ ] **1.1** Create Next.js 14 project via Vercel CLI. Configure Tailwind CSS. Deploy blank app to Vercel to confirm pipeline works.
- [ ] **1.2 (P)** Set up brand design tokens in `lib/colors.ts`: all hex values from brand guidelines, severity color map, typography scale using Inter via Google Fonts.
- [ ] **1.3 (P)** Create `lib/types.ts`: TypeScript interfaces for `Consultant`, `Situation`, `Notification`, `ScanResult`, `Coach`, `KnownEvent`, `SeverityLevel`.
- [ ] **1.4 (P)** Generate `data/roster.json`: Python script to create 600 synthetic consultant records with culturally appropriate names, distributed across ~50 countries weighted toward the 19 priority countries. Include city-level lat/long, timezone, coach assignment, team, role, start date.
- [ ] **1.5 (P)** Create `data/known-events.json`: Seed file with 15-20 ongoing/recurring situations (Russia-Ukraine, Sudan conflict, Brazil Carnival dates, monsoon seasons, hurricane season windows, known internet reliability issues by country).
- [ ] **1.6 (P)** Create `data/coaches.json`: 11 coach profiles with name, email, regions/countries covered.
- [ ] **1.7** Implement simple password auth: `/api/auth/login.py` validates against `AUTH_PASSWORD` env var, sets a session cookie. Middleware checks cookie on all `/dashboard` routes. Login page at `/login` with brand styling.
- [ ] **1.8** Set up Vercel Postgres database. Run schema migration to create `situations`, `notifications`, `scan_history`, `sessions` tables.
- [ ] **1.9** Configure environment variables in Vercel: `AUTH_PASSWORD`, `ANTHROPIC_API_KEY`, `WEATHER_API_KEY`, `NEWS_API_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `CRON_SECRET`.
- [ ] **1.10** Create `AppShell.tsx` layout component: sidebar navigation (Dashboard, Briefing, Notifications, Ask), header with "Global Pulse" wordmark, brand colors applied. Dark sidebar (`#020023`), light content area (`#F7F6FE`).

### PHASE 2: Core Agent (LangChain + Tools)

- [ ] **2.1** Install and configure LangChain with Anthropic Claude provider. Create base agent module with system prompt (the "Global Pulse" persona from the spec). Verify basic conversational responses via a test API route.
- [ ] **2.2** Build **Tool 1 — Roster Lookup**: Python function that loads `roster.json`, supports queries by country, region, city, coach, team. Returns structured list of matching consultants. Register as LangChain tool with clear description and parameter schema.
- [ ] **2.3** Build **Tool 2 — Weather Monitor**: Python function that calls WeatherAPI.com alerts endpoint for a given city/country. Parses response into structured alert objects with severity mapping (🟢🟡🟠🔴). Handles rate limits gracefully. Register as LangChain tool.
- [ ] **2.4** Build **Tool 3 — News/Events Scanner**: Python function that queries NewsAPI.org by country + GDELT for real-time events. Merges with `known-events.json` for ongoing situations. Classifies events by type and severity. Register as LangChain tool.
- [ ] **2.5** Build **Tool 4 — Email Notification Drafter**: Python function that takes situation data + affected consultants, generates a draft email (subject, body HTML, recipient). Does NOT send — saves to `notifications` table with status `draft`. Register as LangChain tool.
- [ ] **2.6** Wire all four tools into the LangChain agent. Test multi-tool orchestration: send "Check on our team in Brazil" and verify it calls Roster → Weather → News → Email Draft in sequence.
- [ ] **2.7** Implement agent memory: LangChain `ConversationBufferMemory` or `ConversationSummaryMemory` for within-session continuity. Persist active situations to database so cross-session awareness works.
- [ ] **2.8** Create `/api/agent/chat.py` API route: accepts `{ message, conversation_id }`, invokes agent, returns structured response. Handle errors, timeouts, rate limits.

### PHASE 3: Dashboard UI

- [ ] **3.1** Build `SeverityBadge.tsx` component: renders 🟢🟡🟠🔴 with brand-mapped colors. Reusable across all views.
- [ ] **3.2** Build `StatsBar.tsx`: top-of-dashboard metrics — countries monitored (19), active situations (count), consultants in affected areas (count), last scan time.
- [ ] **3.3 (P)** Build `SituationCard.tsx`: displays one situation — severity badge, title, country flag emoji, summary, affected consultant count, event type tag, time since detection, "View Details" and "Draft Notification" action buttons.
- [ ] **3.4 (P)** Build `SituationList.tsx`: sorted list of `SituationCard` components. Sort by severity (🔴 first), then by recency. Filter controls: by country, by severity, by event type.
- [ ] **3.5 (P)** Build `GlobalMap.tsx`: world map visualization showing consultant locations with severity-colored pins. Can use a lightweight SVG world map or Leaflet with minimal tile layer. Clicking a country drills into `CountryOverview`.
- [ ] **3.6** Build `CountryOverview.tsx`: detail view for a single country — all active situations, full consultant roster in that country with `AffectedRoster.tsx` table, coach assignments, timezone info.
- [ ] **3.7** Build `AffectedRoster.tsx`: table showing consultants in an affected area — name, city, team, coach, role, start date (flag new hires < 90 days with a badge).
- [ ] **3.8** Assemble `dashboard/page.tsx`: `StatsBar` + `GlobalMap` + `SituationList`. Fetch data from `/api/situations/active`. Auto-refresh every 5 minutes.
- [ ] **3.9** Build `dashboard/briefing/page.tsx`: morning briefing view — all situations grouped by severity, then by country. Summary narrative at top (agent-generated). Designed to be scannable in under 60 seconds.

### PHASE 4: Chat Interface (Ask the Agent)

- [ ] **4.1** Build `ChatWindow.tsx`: scrollable message thread with user messages (right-aligned) and agent responses (left-aligned, brand purple accent).
- [ ] **4.2** Build `ChatInput.tsx`: text input with send button. Disable while agent is processing. Show typing indicator.
- [ ] **4.3** Build `AgentResponse.tsx`: renders agent text with inline `SituationCard` components when the response includes situation data. Parses structured agent output into rich UI.
- [ ] **4.4** Assemble `dashboard/ask/page.tsx`: `ChatWindow` + `ChatInput`. Connect to `/api/agent/chat`. Maintain conversation history in component state.
- [ ] **4.5** Test end-to-end agent conversation: "Check on our team in Argentina" → agent calls tools → response renders with situation cards and affected roster inline.

### PHASE 5: Email Notification System

- [ ] **5.1** Build email templates using React Email (compatible with Resend): `CheckInEmail`, `TeamNotifyEmail`, `EscalationEmail`, `AllClearEmail`, `BriefingEmail`. Each accepts situation data and dashboard screenshot URL. Brand-styled with Lumenalta colors and Inter font.
- [ ] **5.2** Build `/api/screenshot/render` route using @vercel/og: renders a simplified `SituationCard` or briefing summary as a PNG image. Accepts situation ID or briefing type as query param.
- [ ] **5.3** Build `EmailPreview.tsx`: renders the full email as it will appear in the recipient's inbox, including the embedded dashboard screenshot. Shows recipient, subject, body.
- [ ] **5.4** Build `ApprovalActions.tsx`: Approve / Edit / Dismiss buttons. Approve triggers `/api/notifications/approve` → `/api/email/send`. Edit opens inline editor for subject and body. Dismiss moves to dismissed status.
- [ ] **5.5** Build `dashboard/notifications/page.tsx`: approval queue — list of pending draft emails with `EmailPreview` and `ApprovalActions` for each. Also includes a "Sent" tab showing `NotificationHistory`.
- [ ] **5.6** Implement `/api/email/send.py`: calls Resend API with rendered HTML email + inline screenshot image. Logs result to `notifications` table.
- [ ] **5.7** Implement timezone-aware email queuing: non-critical emails queue for delivery during recipient's working hours (9am-6pm local). 🔴 Critical emails bypass the queue and send immediately.
- [ ] **5.8** Implement 🔴 Critical auto-escalation: when a situation is classified as Critical, automatically generate an escalation email to SRuss (team lead), render dashboard screenshot, and send immediately — bypassing the approval queue. Log the bypass with reason.

### PHASE 6: Proactive Monitoring (Cron Jobs)

- [ ] **6.1** Create `/api/cron/scan-priority.py`: Vercel Cron handler that iterates through all 19 priority countries, calls Weather Monitor + News Scanner for each, compares results against existing `situations` in DB, creates new situations or updates severity on existing ones. Detects escalations (severity increased since last check). Secured via `CRON_SECRET` header.
- [ ] **6.2** Create `/api/cron/daily-briefing.py`: runs at 06:00 CT daily. Compiles all active situations into a morning briefing. Saves to DB. Optionally triggers a briefing email to all coaches.
- [ ] **6.3** Configure `vercel.json` cron schedules:
  ```json
  {
    "crons": [
      { "path": "/api/cron/scan-priority", "schedule": "0 */4 * * *" },
      { "path": "/api/cron/daily-briefing", "schedule": "0 11 * * *" }
    ]
  }
  ```
  (11:00 UTC = 06:00 CT)
- [ ] **6.4** Implement escalation detection logic: compare `previous_severity` with current severity on each scan. If severity increased (e.g., 🟡→🟠 or 🟠→🔴), flag as escalation. If 🔴, trigger auto-escalation email (Phase 5, Task 5.8).
- [ ] **6.5** Implement de-escalation and resolution detection: if an active situation no longer appears in API results for 2+ consecutive scans, mark as `monitoring`. After 24 hours in `monitoring` with no re-detection, mark as `resolved`. Generate all-clear notification drafts for previously notified consultants.
- [ ] **6.6** Build scan status indicator in dashboard header: shows "Last scan: 12 minutes ago" with a green/yellow/red dot based on recency. Yellow if > 5 hours since last scan. Red if > 8 hours.

### PHASE 7: Polish + Hardening

- [ ] **7.1 (P)** Error handling sweep: ensure all API routes return meaningful error messages. Agent failures gracefully degrade (show "unable to check this region" rather than crash).
- [ ] **7.2 (P)** Loading states: skeleton loaders for `SituationList`, `GlobalMap`, `AffectedRoster`. Typing indicator in chat. Spinner on email send.
- [ ] **7.3 (P)** Empty states: "No active situations — all clear across 19 monitored countries" with a 🟢 icon. "No pending notifications" in the queue. First-use guidance in the chat interface.
- [ ] **7.4 (P)** Responsive design: dashboard usable on tablet (coaches may check on iPad). Chat interface usable on mobile.
- [ ] **7.5** Rate limit safeguards: implement request throttling for Weather and News APIs. If free tier limits are approaching, degrade gracefully (use cached results, extend scan interval).
- [ ] **7.6** Seed the database with 3-5 realistic test situations so the dashboard isn't empty on first load. Include at least one 🟠 High and one 🟡 Moderate to demonstrate the full severity spectrum.
- [ ] **7.7** Accessibility pass: ensure all interactive elements are keyboard-navigable. Color indicators always accompanied by text labels (not color-only). Sufficient contrast ratios per WCAG AA.
- [ ] **7.8** Final brand audit: compare every screen against the Lumenalta Brand Standards Guide. Verify color usage, typography hierarchy, icon consistency, and voice/tone in all UI copy.

### PHASE 8: Testing + Deployment

- [ ] **8.1** End-to-end test: "Check on our team in Brazil" → agent calls all tools → situations created → notifications drafted → coach approves → email sent with screenshot. Verify the full loop.
- [ ] **8.2** Cron job test: manually trigger `/api/cron/scan-priority` and `/api/cron/daily-briefing`. Verify situations are created/updated, escalations detected, briefing compiled.
- [ ] **8.3** Escalation test: seed a situation as 🟡 Moderate, then simulate an API response that would upgrade it to 🔴 Critical. Verify auto-escalation email fires to SRuss.
- [ ] **8.4** Edge case testing: test with a country that has zero consultants (should gracefully skip). Test with a city that returns no weather data. Test with NewsAPI returning zero results.
- [ ] **8.5** Deploy final version to Vercel production. Verify cron jobs are running. Verify email delivery via Resend dashboard. Verify Postgres is persisting data.
- [ ] **8.6** Create `README.md` with: project overview, setup instructions, environment variable list, architecture diagram, and how to run locally.

---

## Summary: Task Count by Phase

| Phase | Name | Tasks | Parallelizable |
|---|---|---|---|
| 1 | Foundation | 10 | 5 |
| 2 | Core Agent | 8 | 0 (sequential — each tool builds on the last) |
| 3 | Dashboard UI | 9 | 3 |
| 4 | Chat Interface | 5 | 0 |
| 5 | Email System | 8 | 0 |
| 6 | Proactive Monitoring | 6 | 0 |
| 7 | Polish + Hardening | 8 | 4 |
| 8 | Testing + Deployment | 6 | 0 |
| **Total** | | **60 tasks** | **12 parallelizable** |

---

## Recommended Build Order for Cursor

**Session 1 (Foundation):** Tasks 1.1–1.10. Get the skeleton deployed, auth working, data files generated, database live. ~2-3 hours.

**Session 2 (Agent Core):** Tasks 2.1–2.8. This is the intellectual heart. Build each tool individually, test each one, then wire them together. ~3-4 hours.

**Session 3 (Dashboard):** Tasks 3.1–3.9. Visual payoff. The dashboard comes alive with real situation data. ~2-3 hours.

**Session 4 (Chat + Email):** Tasks 4.1–4.5, 5.1–5.8. The interaction layer — ask the agent questions, draft emails, approve and send. ~3-4 hours.

**Session 5 (Cron + Polish):** Tasks 6.1–6.6, 7.1–7.8. Make it proactive and production-hardened. ~2-3 hours.

**Session 6 (Test + Ship):** Tasks 8.1–8.6. Full loop validation and final deploy. ~1-2 hours.

**Estimated total: ~15-20 hours of focused build time with Cursor doing the heavy lifting.**
