/**
 * Ingest known-events.json into situations — real data from data/
 * Used by scripts/ingest-known-events.ts and POST /api/seed
 */

import { loadRoster } from "./roster-loader";
import { PRIORITY_COUNTRIES } from "./constants";
import { sql, isDatabaseConfigured } from "./db";

interface KnownEvent {
  id?: string;
  title: string;
  description?: string;
  event_type: string;
  countries_affected?: string[];
  severity: string;
  typical_dates?: string | null;
  infrastructure_impact?: string | null;
}

function getCountryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function isEventActiveNow(typicalDates: string | null | undefined): boolean {
  if (!typicalDates || !typicalDates.trim()) return true;
  const s = typicalDates.toLowerCase();
  if (
    s.includes("ongoing") ||
    s.includes("year-round") ||
    s.includes("event-driven") ||
    s.includes("unpredictable")
  )
    return true;
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const currentMonth = months[new Date().getMonth()];
  if (s.includes(currentMonth!)) return true;
  const rangeMatch = s.match(/(\w+)\s*-\s*(\w+)/);
  if (rangeMatch) {
    const [, start, end] = rangeMatch;
    const idx = months.indexOf(start!);
    const endIdx = months.indexOf(end!);
    if (idx >= 0 && endIdx >= 0) {
      const now = new Date().getMonth();
      if (idx <= endIdx) return now >= idx && now <= endIdx;
      return now >= idx || now <= endIdx;
    }
  }
  return true;
}

export async function ingestKnownEvents(): Promise<{ inserted: number; error?: string }> {
  if (!isDatabaseConfigured() || !sql) {
    return { inserted: 0, error: "Database not configured" };
  }

  const { entries } = await loadRoster();
  const rosterCountryCodes = new Set(entries.map((e) => e.country_code));
  const priorityCodes = new Set(PRIORITY_COUNTRIES.map((p) => p.code));
  const monitoredCountries = new Set([...rosterCountryCodes, ...priorityCodes]);

  const rosterCountByCountry = new Map<string, number>();
  for (const e of entries) {
    rosterCountByCountry.set(e.country_code, (rosterCountByCountry.get(e.country_code) ?? 0) + 1);
  }

  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  const knownEventsPath = path.join(process.cwd(), "data", "known-events.json");
  const raw = await fs.readFile(knownEventsPath, "utf-8");
  const knownEvents: KnownEvent[] = JSON.parse(raw);

  try {
    await sql`DELETE FROM situations WHERE source_name = 'known-events'`;

    let inserted = 0;
    for (const ev of knownEvents) {
      if (!isEventActiveNow(ev.typical_dates)) continue;

      const countries = ev.countries_affected ?? [];
      const matching = countries.filter((cc) => monitoredCountries.has(cc));
      if (matching.length === 0) continue;

      for (const countryCode of matching) {
        const country = getCountryName(countryCode);
        const affected = rosterCountByCountry.get(countryCode) ?? 0;

        await sql`
          INSERT INTO situations (
            country_code, country, region, city, event_type, severity,
            title, summary, source_url, source_name, infrastructure_impact,
            affected_consultant_count, status, first_detected_at, last_checked_at
          ) VALUES (
            ${countryCode}, ${country}, NULL, NULL, ${ev.event_type}, ${ev.severity.toLowerCase()},
            ${ev.title}, ${ev.description ?? ev.title}, NULL, 'known-events', ${ev.infrastructure_impact ?? null},
            ${affected}, 'active', NOW(), NOW()
          )
        `;
        inserted++;
      }
    }

    await sql`
      INSERT INTO scan_history (scan_type, countries_scanned, situations_found, duration_ms)
      VALUES ('ingest-known-events', ${Array.from(monitoredCountries).join(",")}, ${inserted}, 0)
    `;

    return { inserted };
  } catch (err) {
    return { inserted: 0, error: (err as Error).message };
  }
}
