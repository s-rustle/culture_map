/**
 * Global Pulse — Timezone-aware email queuing (Task 5.7)
 * If coach local time is outside 9am–6pm, queue for 9am their time.
 */

/**
 * Get current hour (0–23) in the coach's timezone.
 */
export function getLocalHour(timezone: string): number {
  return getLocalHourForDate(new Date(), timezone);
}

function getLocalHourForDate(d: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const hour = parts.find((p) => p.type === "hour");
    return hour ? parseInt(hour.value, 10) : 12;
  } catch {
    return 12;
  }
}

/**
 * True if local time is within 9am–6pm (inclusive start, exclusive end).
 */
export function isWithinBusinessHours(timezone: string): boolean {
  const hour = getLocalHour(timezone);
  return hour >= 9 && hour < 18;
}

/**
 * Get next 9am in the coach's timezone as an ISO string.
 * Uses: offset = (UTC hour - local hour) for same moment; UTC for 9am local = 9 + offset.
 */
export function getNext9amLocal(timezone: string): string {
  try {
    const now = new Date();
    const hour = getLocalHourForDate(now, timezone);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
    let y = get("year");
    let m = get("month").padStart(2, "0");
    let d = get("day").padStart(2, "0");
    if (hour >= 9) {
      const tomorrow = new Date(now.getTime() + 86400000);
      const p2 = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour12: false,
      }).formatToParts(tomorrow);
      y = p2.find((p) => p.type === "year")?.value ?? y;
      m = (p2.find((p) => p.type === "month")?.value ?? m).padStart(2, "0");
      d = (p2.find((p) => p.type === "day")?.value ?? d).padStart(2, "0");
    }
    const offsetHours = getOffsetHours(timezone, now);
    const utcHour = 9 + offsetHours;
    const utc = Date.UTC(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      Math.floor(utcHour),
      (utcHour % 1) * 60,
      0
    );
    return new Date(utc).toISOString();
  } catch {
    /* fallthrough */
  }
  const fallback = new Date();
  fallback.setUTCDate(fallback.getUTCDate() + 1);
  fallback.setUTCHours(9, 0, 0, 0);
  return fallback.toISOString();
}

function getOffsetHours(tz: string, date: Date): number {
  const utcHour = parseInt(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      hour: "numeric",
      hour12: false,
    }).formatToParts(date).find((p) => p.type === "hour")?.value ?? "0",
    10
  );
  const localHour = parseInt(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).formatToParts(date).find((p) => p.type === "hour")?.value ?? "0",
    10
  );
  return utcHour - localHour;
}
