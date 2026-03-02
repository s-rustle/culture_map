# Coaches Data Format (Amendment 1)

Global Pulse loads coach profiles from `data/coaches.json`. Place your coach list here.

## Expected Schema

Each coach has **4 fields**:

| Field     | Type    | Required | Description                                    |
|-----------|---------|----------|------------------------------------------------|
| name      | string  | ✅ Yes   | Coach full name                                |
| email     | string  | ✅ Yes   | Coach email (used for login)                    |
| timezone  | string  | ✅ Yes   | IANA timezone (e.g., America/Chicago)          |
| is_admin  | boolean | ✅ Yes   | `true` for admin (SRuss); `false` for coaches |

**Admin (`is_admin: true`)** has full access: all countries, admin panel, approve/dismiss any notification, override coach subscriptions.

**Coaches** configure their own subscriptions (countries, event types, severity threshold) via the dashboard. All coaches can subscribe to any country/event.

## JSON Format

```json
[
  {
    "name": "Sarah Russell",
    "email": "sarah.russell@lumenalta.com",
    "timezone": "America/Chicago",
    "is_admin": true
  },
  {
    "name": "Coach Name",
    "email": "coach@lumenalta.com",
    "timezone": "America/New_York",
    "is_admin": false
  }
]
```

## Example File

See `data/coaches-schema-example.json` for two sample records.
