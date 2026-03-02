# Global Pulse — Situational Awareness Agent for Remote Teams
## Spec Kit: Constitution + Specification + Clarification (Complete)

---

## 1. CONSTITUTION

### Project Identity
**Name:** Global Pulse
**Owner:** Culture & People Team Lead, Lumenalta (fully remote software consultancy)
**Users:** HR team of 11 coaches serving ~600 globally distributed software developers and consultants across ~50 countries
**Deployment:** Next.js 14 on Vercel — multi-user web dashboard, fully functional

### Foundational Principles

**Duty of Care First**
Every feature decision filters through one question: *Does this help us protect and support our people?* The agent exists to reduce the gap between "something happened" and "we knew, we reached out, we cared."

**Signal Over Noise**
Not every rainstorm is an alert. The agent must distinguish between events that materially affect a consultant's ability to work (internet/power outages, safety risks, travel disruptions) and routine weather. Severity thresholds are explicit, not vibes.

**Human-in-the-Loop by Default**
No notification leaves the system without a human reviewing and approving it. The agent drafts; the coach decides. Exception: 🔴 Critical national crises trigger a priority email directly to the team lead (SRuss) with a dashboard screenshot, bypassing the approval queue.

**Privacy-Conscious**
The roster contains real addresses. These are never exposed to external APIs as raw addresses — only country/region/city-level data is sent to weather and news services. The roster stays server-side.

**Memory & Continuity**
Situations evolve. A typhoon warning at 9am becomes a confirmed landfall by 3pm. The agent tracks evolving situations and proactively re-checks flagged locations on a cadence, surfacing escalations and resolutions without being asked.

**Proactive, Not Just Reactive**
The agent doesn't wait for a coach to ask. It runs scheduled scans of all consultant locations, flags emerging situations, and surfaces a prioritized briefing. Coaches can also query on demand.

### Technical Constraints
- **Framework:** LangChain (Python) for agent logic
- **Frontend:** Next.js 14 on Vercel (multi-user web dashboard)
- **LLM:** Claude (Anthropic SDK) via LangChain
- **IDE:** Cursor
- **Data Privacy:** Only city/region/country sent to external APIs; full roster stays server-side
- **APIs:** Free-tier only (OpenWeatherMap, NewsAPI, etc.) + existing Claude API key
- **Notifications:** Email via Resend (free tier: 100 emails/day) — emails include a rendered screenshot of the relevant dashboard view
- **Code Style:** Clean, commented, readable by non-engineers on the Culture team
- **Visual Identity:** Lumenalta Brand Standards Guide (January 2024) — see Visual Design Standards section
- **Brand Voice:** "The Tech Operative" — calm confidence, analytical precision, action-oriented

---

## 2. SPECIFICATION

### Problem Statement

Lumenalta's Culture & People team supports ~600 consultants across ~50 countries. When a natural disaster, political crisis, infrastructure failure, or significant national event occurs, the team currently relies on manual news monitoring, reactive Slack messages from affected individuals, and word of mouth across coach meetings.

**Global Pulse** closes this gap by proactively scanning for events at consultant locations and surfacing actionable intelligence through a persistent web dashboard with email escalation that includes dashboard screenshots for at-a-glance awareness.

### User Stories

1. **As a coach**, I open the dashboard and see a global map with severity indicators on all active/emerging situations, ranked by impact to our people.

2. **As a coach**, I ask the agent "Are any of our people affected by the earthquake in Turkey?" and get a roster-aware answer with affected consultants, their teams, and a draft check-in email.

3. **As a coach**, I ask "What's happening in Brazil this week?" and get weather alerts, Carnival road closures, political developments — anything that affects our consultants' ability to work.

4. **As the team lead**, the system proactively re-checks flagged locations on a cadence and emails me when a situation escalates — e.g., a tropical storm upgraded to a typhoon — with a screenshot of the updated dashboard.

5. **As the team lead**, 🔴 Critical national crises trigger an immediate priority email to me with a dashboard screenshot so I can mobilize the team without logging in.

6. **As a coach**, I draft and approve an email before the system sends it. I see the rendered email (including a dashboard screenshot of the relevant situation), edit if needed, then approve or dismiss.

7. **As the team lead**, I view a morning briefing that synthesizes all active situations across our 19 priority countries into a single scannable report.

### Priority Countries (19)
Argentina, Brazil, Canada, Colombia, Costa Rica, Ecuador, El Salvador, Ireland, Italy, Mexico, Netherlands, Peru, Poland, Portugal, South Africa, Spain, United Kingdom, United States, Uruguay

---

### Agent Architecture

#### System Prompt Persona
**"Global Pulse"** — a calm, precise situational awareness analyst for the Culture & People team. Speaks with the clarity of an intelligence briefing and the warmth of an HR professional. Uses severity levels (🟢 Low / 🟡 Moderate / 🟠 High / 🔴 Critical) consistently. Never sensationalizes. Always recommends a human action.

Mirrors the Lumenalta "Tech Operative" brand persona: *"Quiet confidence. Analytical. Motivated by action, not by accolade."*

---

#### Tool 1: Roster Lookup (Unique Dataset — Local)

**Purpose:** Query the consultant roster by country, region, city, team, coach, or proximity to an event.

**Data Source:** Local JSON file — ~600 synthetic consultant records across ~50 countries, concentrated in the 19 priority countries.

**Fields per record:**

| Field | Description |
|---|---|
| `consultant_id` | Anonymized unique ID |
| `display_name` | Synthetic name (culturally appropriate per country) |
| `city` | City name |
| `region` | State / province / department |
| `country` | Country name |
| `country_code` | ISO 3166-1 alpha-2 |
| `timezone` | IANA timezone (e.g., `America/Sao_Paulo`) |
| `latitude` / `longitude` | City-level coordinates (not street-level) |
| `assigned_coach` | One of 11 coach names |
| `team_or_client` | Anonymized team/client identifier |
| `start_date` | ISO date (identifies new hires needing extra support) |
| `role` | Developer, designer, QA, PM, etc. |

**Roster distribution:**
- Heavy: Brazil, Argentina, Colombia, US, Mexico, Peru
- Moderate: Canada, UK, Spain, Portugal, Poland, South Africa, Ireland
- Lighter: Costa Rica, Ecuador, El Salvador, Italy, Netherlands, Uruguay
- Remaining ~30 countries: 1–5 consultants each

**Example queries routed here:**
- "Who do we have in Valencia, Spain?"
- "How many consultants are in the Philippines?"
- "Show me everyone on Coach Maria's roster in South America"
- "List new hires (< 90 days) in countries with active alerts"

**Privacy:** Operates entirely server-side. No roster data sent to external APIs.

---

#### Tool 2: Weather & Natural Disaster Monitor (External API)

**Purpose:** Check for severe weather alerts, natural disasters, and climate-related disruptions at consultant locations.

**API options (free tier):**
- **OpenWeatherMap** One Call 3.0 — 1,000 calls/day free
- **WeatherAPI.com** — 1M calls/month free
- **Tomorrow.io** — 500 calls/day free (fallback)

**Input:** City / region / country (derived from roster, never raw addresses)

**Output — structured alert data:**
- Event type (flood, hurricane/typhoon, earthquake, wildfire, extreme heat/cold, volcanic, landslide)
- Severity level (🟢🟡🟠🔴)
- Expected duration / timeline
- Affected area
- Infrastructure impact likelihood (power, internet, transportation)
- Source and timestamp

**Severity mapping:**

| Level | Indicator | Meaning | Action |
|---|---|---|---|
| 🟢 Low | Advisory | Unlikely to affect work | Log only |
| 🟡 Moderate | Watch / Warning | May cause intermittent disruptions | Dashboard flag, optional email |
| 🟠 High | Active severe event | Likely power/internet outages, safety concern | Notify affected consultants (coach approves) |
| 🔴 Critical | Life-threatening | Evacuation, prolonged infrastructure failure | Priority email to team lead immediately |

**Major event handling:** Events like Carnival in Brazil that shut down roads and effectively halt a city should be treated as 🟡 Moderate (work disruption) even though they're celebrations. "The city stops functioning" is operationally equivalent to a weather disruption.

---

#### Tool 3: Global Events & News Scanner (External API)

**Purpose:** Scan for political events, civil unrest, wars/conflict, infrastructure crises, major celebrations/disruptions, elections, protests, public health emergencies — anything affecting consultant availability or safety.

**APIs (free tier):**
- **NewsAPI.org** — developer plan, 100 requests/day
- **GDELT Project** — free, unlimited, real-time global event monitoring
- **Known Events Seed File** — local JSON of ongoing/recurring situations (see below)

**Input:** Country or region identifier

**Output:**
- Event summary (agent-written, not raw headline)
- Event type: `political` | `conflict` | `celebration` | `infrastructure` | `public_health` | `economic` | `environmental`
- Relevance assessment: Does this affect work capacity, safety, or morale?
- Impact level (🟢🟡🟠🔴)
- Source attribution and URL
- Timestamp / recency

**Positive events matter too:** National holidays, cultural celebrations, independence days. A coach knowing "tomorrow is Diwali" or "next week is Carnival" prevents a confused "why didn't they attend standup?" moment. These surface as 🟢 informational or 🟡 if they involve significant infrastructure disruption.

**Known Events Seed File:**
A local JSON file pre-loaded with ongoing/recurring situations so the agent doesn't "discover" them fresh each session:
- Ongoing conflicts (Russia-Ukraine, Sudan, Myanmar, etc.)
- Recurring seasonal events (Brazil Carnival, monsoon seasons, hurricane seasons with approximate dates)
- Persistent infrastructure concerns by region
- Known internet reliability challenges by country

This file is manually curated and updated by the team. The agent references it as baseline context and layers real-time API data on top.

---

#### Tool 4: Email Notification Drafter + Sender (External Integration — Email API)

**Purpose:** Generate context-aware draft emails with an embedded dashboard screenshot, present them for human approval, and send upon confirmation.

**Integration:** Resend API (free tier: 100 emails/day, sufficient for alert volumes)

**Screenshot mechanism:** The system captures a rendered image of the relevant dashboard section (the specific country/region situation card or the full briefing view) and embeds it in the email body. Recipients get the visual context without needing to log in.

**Implementation approach:**
- Server-side rendering of the dashboard component to HTML
- HTML-to-image conversion (e.g., Puppeteer, Satori + @vercel/og, or Playwright)
- Embedded as inline image in email via Resend's React email templates

**Workflow:**
1. Agent synthesizes situation from Tools 1–3
2. Agent drafts an email appropriate to the audience and severity
3. System renders a dashboard screenshot of the relevant situation
4. **Human-in-the-loop checkpoint:** Coach sees the draft email + screenshot preview → Approve, Edit, or Dismiss
5. On approval: Resend sends the email with embedded dashboard image
6. **Exception:** 🔴 Critical events bypass the queue and email SRuss directly with dashboard screenshot

**Email types by scenario:**

| Scenario | Recipient | Content |
|---|---|---|
| **Check-in** | Consultant | "We're aware of [event] in your area. Are you safe? Do you need schedule accommodations?" + situation card screenshot |
| **Team notification** | Team lead / client PM | "[Consultant] is in [region] experiencing [event]. Recommend async communication this week." + regional dashboard screenshot |
| **Escalation** | SRuss (team lead) | "🔴 Critical: [event] affecting [N] consultants in [region]. Immediate action recommended." + full briefing screenshot |
| **All-clear** | Previously notified parties | "Update: [event] in [region] has stabilized. [N] consultants confirmed back to normal operations." + updated situation card |
| **Morning briefing** | Full coaching team | Daily digest of all active situations across priority countries + full dashboard screenshot |

**Timezone awareness:** Emails respect the recipient's local time. Non-critical emails queue for delivery during their working hours. 🔴 Critical emails send immediately regardless of time.

---

### Memory Management

The agent maintains state across sessions and interactions:

| What's tracked | Why |
|---|---|
| Active situations by location | Prevents duplicate alerts; tracks evolution |
| Severity at last check vs. current | Flags escalations and de-escalations |
| Which consultants have been notified | Prevents duplicate check-ins; enables all-clear messages |
| Coach actions (approved, dismissed, edited) | Audit trail; informs future recommendations |
| Session history | Continuity across conversations ("the flooding I mentioned this morning...") |

**Persistence:** Stored in a lightweight database (SQLite for local dev, Vercel Postgres or Neon for production) — not just in-memory conversation context.

---

### Human-in-the-Loop Checkpoints

1. **Before any email notification:** Draft → Coach preview (with dashboard screenshot) → Approve / Edit / Dismiss
2. **Severity override:** Coach can upgrade or downgrade an agent's severity assessment
3. **Batch approval:** Morning briefing notifications can be approved/dismissed as a batch
4. **Exception path:** 🔴 Critical → auto-emails SRuss with dashboard screenshot (no approval gate)

---

### Proactive Monitoring (Scheduled Scans)

The system runs automated checks without waiting for a coach to ask:

| Cadence | Scope | Action |
|---|---|---|
| Every 4 hours | All 19 priority countries | Weather + news scan; flag new/changed situations |
| Daily at 06:00 CT | Full global roster | Morning briefing compiled and available on dashboard |
| On escalation detection | Affected locations only | Priority email to SRuss if any situation crosses into 🟠 or 🔴 |
| Event-driven | Flagged locations | Re-check when a known event's timeline suggests change (e.g., hurricane landfall window) |

**Implementation:** Vercel Cron Jobs (free tier supports cron on Hobby plan) triggering API route handlers that invoke the agent.

---

### Multi-Tool Orchestration Scenario

**Trigger:** Coach asks "Check on our team in Brazil"

**Flow:**
1. **Roster Lookup** → Returns 87 consultants across São Paulo, Rio de Janeiro, Curitiba, Belo Horizonte, Recife, and 8 other cities
2. **Known Events Seed** → Carnival is in 3 days; flagged as 🟡 Moderate for Rio, São Paulo, Salvador (city infrastructure effectively shuts down)
3. **Weather Monitor** → Checks all cities; finds heavy flooding warnings for Recife (🟠 High) and extreme heat advisory for São Paulo (🟡 Moderate)
4. **News Scanner** → Political protests reported in Brasília (🟡 Moderate, no consultants there); power grid strain in northeast region
5. **Agent synthesizes:** Briefing card showing 3 active situations, 87 consultants affected at varying levels, recommended actions by priority
6. **Notification Drafter** → Generates:
   - Check-in emails for 12 Recife consultants (🟠 flooding)
   - Carnival advisory email for Rio/SP/Salvador teams
   - Dashboard screenshot captured for each email
7. **Human-in-the-Loop** → Coach reviews all drafts in the dashboard, approves 12 Recife emails, edits the Carnival advisory, dismisses one duplicate

---

### Visual Design Standards (Lumenalta Brand Guidelines)

All UI elements adhere to the Lumenalta Brand Standards Guide (January 2024).

#### Color System

**Primary Palette (dominant — backgrounds and text)**

| Role | Hex | Usage |
|---|---|---|
| Light Background | `#F7F6FE` | Main app background, cards, content areas |
| Dark Background | `#020023` | Dark mode, nav, headers, hero sections |

**Secondary Palette (strategic — draw the eye, highlight key info)**

| Role | Hex | Usage |
|---|---|---|
| Primary Accent (Purple) | `#7357FF` | Buttons, links, active states, focus rings |
| High-Impact (Yellow-Green) | `#EBFF00` | 🔴 Critical alerts, primary CTAs, urgent badges |
| Violet | `#AD39FF` | 🟠 High severity highlights |
| Magenta | `#E82DE8` | Sparingly — data viz differentiation only |

**Tertiary Palette (supporting — visual depth)**

| Role | Hex | Usage |
|---|---|---|
| Dark Indigo | `#282859` | Dark mode cards, elevated surfaces |
| Pale Lavender | `#ECEAF8` | Hover states, subtle backgrounds |
| Light Gray-Violet | `#DCDAED` | Borders, dividers, inactive elements |
| Medium Gray-Violet | `#A1A1C6` | Secondary text, timestamps, metadata |
| Charcoal Violet | `#57576B` | Tertiary labels on light backgrounds |

**Severity ↔ Brand Color Mapping**

| Level | Color Treatment |
|---|---|
| 🟢 Low | Muted green `#4ADE80` — harmonizes with brand palette |
| 🟡 Moderate | `#EBFF00` at 40% opacity or muted variant on light BG |
| 🟠 High | `#AD39FF` (violet) with warm amber `#F59E0B` accent |
| 🔴 Critical | `#EBFF00` text on `#020023` background (maximum brand contrast) |

*Brand rule: Secondary colors used sparingly. Their power comes from restraint.*

#### Typography

| Role | Font | Fallback |
|---|---|---|
| Headlines | FK Grotesk → **Inter** (web substitute) | `'Public Sans', system-ui, sans-serif` |
| Body | Decagram → **Inter** (web substitute) | `'Public Sans', system-ui, sans-serif` |
| Data / Code | — | `'JetBrains Mono', 'Fira Code', monospace` |

*Load Inter via Google Fonts CDN. Consistent with existing Lumenalta internal tooling.*

#### Brand Voice in UI Copy

- **Alerts:** Precise, unsensational. "Typhoon Gaemi approaching Cebu — Category 2, landfall expected 14:00 local"
- **Recommendations:** Direct, accountable. "Recommend: async-only communication for Cebu team through Friday"
- **Tone:** Quiet competence. Trusted intelligence briefer, not a news ticker.

#### Iconography
- Primary: Streamline Sharp icon set (per brand guidelines)
- Fallback: Lucide React (stylistically compatible)

#### Layout Principles
- Light mode default (`#F7F6FE`) with dark mode support (`#020023`)
- Purple `#7357FF` for interactive elements — never overused
- Yellow-green `#EBFF00` reserved for critical/urgent only

---

### Sprint Deliverable Checklist

| Requirement | How Global Pulse Satisfies It |
|---|---|
| System Prompt for unique application | ✅ Situational awareness analyst with severity framework and brand voice |
| Four tools minimum | ✅ Roster Lookup, Weather Monitor, News Scanner, Email Notification Drafter |
| Unique Dataset | ✅ 600-person consultant roster (local JSON) + Known Events seed file |
| External API | ✅ Weather API + News API (free tier) |
| External Integration (MCP or External Tool) | ✅ Resend email API with dashboard screenshot embedding |
| Memory Management | ✅ Persistent DB tracking situations, notifications, escalations across sessions |
| Human-in-the-Loop | ✅ Approval gate on all outbound emails; severity override; batch approval |
| Multi-tool orchestration | ✅ "Check on our team in [country]" triggers all four tools in sequence |

---

## 3. CLARIFICATION ANSWERS (Resolved)

| # | Question | Answer | Spec Impact |
|---|---|---|---|
| 1 | Roster format | Synthetic, ~600 across ~50 countries | Generate realistic JSON with cultural naming |
| 2 | API budget | Free tier only; existing Claude API key | OpenWeatherMap + NewsAPI + GDELT |
| 3 | Notification channel | Email with dashboard screenshot (not Slack) | Resend API + server-side screenshot rendering |
| 4 | LLM provider | Claude via LangChain, built in Cursor on Vercel | Anthropic SDK, Next.js deployment |
| 5 | Priority countries | 19 countries specified | Roster distribution weighted accordingly |
| 6 | Holiday data | Only if operationally disruptive (Carnival-level) | Known Events Seed File covers these |
| 7 | Escalation logic | Proactive re-check on cadence | Vercel Cron: every 4 hours + daily briefing |
| 8 | UI scope | Full multi-user web dashboard | Next.js with auth, persistent state, dashboard |
| 9 | Timezone awareness | Email timing respects local time; 🔴 Critical overrides | Queue logic with timezone-aware delivery |
| 10 | Historical context | Yes, seed file for ongoing situations | Known Events JSON, manually curated |

---

## 4. READY FOR PLANNING

With all clarifications resolved, the next phase is **Planning** — defining the architecture, technology stack, API selections, database schema, and breaking the build into sequenced implementation tasks.

**Key architecture decisions to make in Planning:**
1. Authentication strategy (who can access the dashboard?)
2. Database choice (SQLite local → Vercel Postgres production)
3. Screenshot rendering approach (Satori/OG Image vs. Puppeteer vs. Playwright)
4. Cron job structure and rate limit management across free-tier APIs
5. Dashboard component architecture (map view, situation cards, briefing view, email approval queue)
6. Agent invocation pattern (API route → LangChain agent → tools → response)
