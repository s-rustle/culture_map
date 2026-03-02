# Global Pulse — Spec Amendment #1
## Roster Simplification + Coach Subscription Notification Model

---

### CHANGE 1: Roster Schema

**Before:** 12 fields including name, email, role, start_date, assigned_coach, team_or_client
**After:** 2 required fields. Everything else derived or optional-future.

| Field | Source | Required |
|---|---|---|
| `city` | Provided by SRuss (CSV) | ✅ Yes |
| `country` | Provided by SRuss (CSV) | ✅ Yes |
| `country_code` | Auto-derived from country name | Auto |
| `timezone` | Auto-derived from city/country | Auto |
| `latitude` | Auto-derived from city/country | Auto |
| `longitude` | Auto-derived from city/country | Auto |
| `name` | Optional — added later when de-anonymized | Future |

The roster answers ONE question: **how many of our people are in each location?** No PII. No individual identification. Just geographic distribution.

Input format: CSV with two columns:
```
city,country
São Paulo,Brazil
Medellín,Colombia
Kraków,Poland
```

---

### CHANGE 2: Notification Model — Coach Subscriptions

**Before:** App emails individual consultants and team leads. Coaches approve outbound emails to individuals.
**After:** App ONLY emails coaches. Coaches subscribe to the alerts they want. Admin (SRuss) can override.

#### How it works:

**Coaches** log in and configure their preferences:
- **Countries:** Select which countries they want alerts for (multi-select from the 19 priority + any others with consultants)
- **Event types:** Select which categories they want (weather, crisis/conflict, political, celebration/disruption, infrastructure, public_health)
- **Severity threshold:** Minimum severity to trigger an email (e.g., "only email me for 🟠 High and 🔴 Critical")

**Admin (SRuss)** has an admin panel to:
- View all coach subscriptions
- Assign a coach to a country (override — they get alerts whether they opted in or not)
- Assign a coach to an event type
- Remove a coach from a country or event type
- Set a coach's severity threshold
- View/manage all coaches

**Email flow:**
1. Situation detected (via scan or manual query)
2. System checks: which coaches are subscribed to this country + event type + severity?
3. Draft emails generated for each qualifying coach
4. Emails include dashboard screenshot of the situation
5. **Human-in-the-loop:** SRuss (admin) can review the queue and approve/dismiss before send
6. **Exception:** 🔴 Critical events auto-send to ALL coaches subscribed to that country + always to SRuss regardless of subscription

#### Coach roles:

| Role | Capabilities |
|---|---|
| **Admin (SRuss)** | Full access: manage all subscriptions, override assignments, approve/dismiss any email, view all situations, trigger manual scans, access admin panel |
| **Coach** | View dashboard, configure own subscriptions, view situations for subscribed countries, use chat/ask interface |

---

### CHANGE 3: Updated Database Schema

```sql
-- Coaches: the only email recipients
CREATE TABLE coaches (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(300) NOT NULL UNIQUE,
  timezone      VARCHAR(50) NOT NULL,
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Coach subscription preferences
CREATE TABLE coach_subscriptions (
  id            SERIAL PRIMARY KEY,
  coach_id      INTEGER REFERENCES coaches(id) ON DELETE CASCADE,
  country_code  VARCHAR(2) NOT NULL,          -- subscribed country
  event_types   TEXT NOT NULL DEFAULT '[]',   -- JSON array: ["weather","crisis","political", etc.]
  min_severity  VARCHAR(10) DEFAULT 'moderate', -- low, moderate, high, critical
  is_admin_override BOOLEAN DEFAULT FALSE,    -- true if SRuss assigned this, not self-selected
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(coach_id, country_code)
);

-- Notifications: now always to coaches, never to consultants
CREATE TABLE notifications (
  id            SERIAL PRIMARY KEY,
  situation_id  INTEGER REFERENCES situations(id),
  coach_id      INTEGER REFERENCES coaches(id),
  email_type    VARCHAR(30) NOT NULL,         -- alert, escalation, briefing, all_clear
  subject       VARCHAR(500) NOT NULL,
  body_html     TEXT NOT NULL,
  screenshot_url TEXT,
  status        VARCHAR(20) DEFAULT 'draft',  -- draft, approved, sent, dismissed, failed
  approved_by   INTEGER REFERENCES coaches(id), -- admin who approved (NULL for auto-send)
  approved_at   TIMESTAMP,
  sent_at       TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

---

### CHANGE 4: Updated Tool 4 — Email Notification Drafter

**Purpose:** Draft alert emails to subscribed coaches, present for admin approval, send on confirmation.

**Workflow:**
1. Situation detected with severity + country + event type
2. Query `coach_subscriptions`: find all coaches where `country_code` matches AND `event_types` includes the event type AND severity meets their `min_severity` threshold
3. Generate a draft email for each qualifying coach with dashboard screenshot
4. Save drafts to `notifications` table
5. Admin (SRuss) reviews queue → Approve / Edit / Dismiss
6. **Auto-send exception:** 🔴 Critical → sends immediately to all qualifying coaches + SRuss (always)

**Email content:**
- Subject: "[🟠 High] Flooding in Recife, Brazil — 12 consultants in area"
- Body: situation summary, affected consultant count by city, recommended awareness/action, dashboard screenshot embedded
- Footer: link to dashboard for full details

---

### CHANGE 5: Updated Auth Model

**Before:** Single shared password for all users.
**After:** Still simple, but role-aware.

| Approach | How it works |
|---|---|
| **Login** | Coach enters email + shared password. App looks up email in `coaches` table. If `is_admin = true`, they get admin features. |
| **Session** | Cookie-based. Session stores coach_id and is_admin flag. |
| **Future** | Can layer in individual passwords or SSO later. |

This means coaches see a personalized dashboard filtered to their subscribed countries, while SRuss sees everything + the admin panel.

---

### CHANGE 6: Updated Dashboard Views

**Coach view (default):**
- Dashboard filtered to their subscribed countries only
- Situation cards for active events in their countries
- Chat/ask interface scoped to their countries
- Settings page to manage their own subscriptions

**Admin view (SRuss):**
- Full global dashboard — all countries, all situations
- Admin panel: manage all coach subscriptions
- Notification queue: approve/dismiss pending emails for any coach
- Trigger manual scans
- Override coach subscriptions

---

### Impact on Task List

| Phase | Tasks Affected | Change |
|---|---|---|
| Phase 1 | 1.4 (roster) | Simplified to 2-column CSV loader |
| Phase 1 | 1.6 (coaches) | SRuss provides real data; schema updated |
| Phase 1 | 1.7 (auth) | Email + shared password; role-aware sessions |
| Phase 1 | 1.8 (database) | Add `coaches` and `coach_subscriptions` tables |
| Phase 1 | NEW 1.11 | Build admin panel page for managing subscriptions |
| Phase 3 | 3.8 (dashboard) | Role-aware: filtered for coaches, full for admin |
| Phase 5 | 5.1–5.8 (email) | Recipients are coaches only; subscription-based targeting |
| Phase 5 | NEW 5.9 | Coach settings page for managing own subscriptions |
