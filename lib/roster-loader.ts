/**
 * Global Pulse — Roster Data Ingestion (Amendment 1)
 *
 * Loads roster from data/roster.csv. Two columns: city, country.
 * No PII. Auto-derives country_code, timezone, latitude, longitude.
 *
 * @see data/roster-schema-example.csv — Expected format
 * @see docs/ROSTER_FORMAT.md — Export and column mapping documentation
 */

import type { RosterEntry } from "./types";
import { deriveGeo } from "./geo-lookup";

// =============================================================================
// EXPECTED SCHEMA (Amendment 1)
// =============================================================================
//
// Two required columns (order and header names flexible):
//
// | Column   | Aliases                    | Description                    |
// |----------|----------------------------|--------------------------------|
// | city     | city, City, state, State, region, Region | Location (city or state/province) |
// | country  | country, Country           | Country name                   |
//
// Derived (auto-populated): country_code, timezone, latitude, longitude
//

const CITY_ALIASES = ["city", "state", "region", "location"];
const COUNTRY_ALIASES = ["country"];

// =============================================================================
// TYPES
// =============================================================================

export interface RosterLoadOptions {
  /** Path to CSV file (relative to project root) */
  path?: string;
}

export interface RosterLoadResult {
  entries: RosterEntry[];
  errors: string[];
  source: "csv";
}

// =============================================================================
// CSV PARSING
// =============================================================================

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  let i = 1;
  while (i < lines.length) {
    const result = parseCSVLineWithContinuation(lines, i);
    const values = result.values;
    i = result.nextIndex;

    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.replace(/^"|"$/g, "").replace(/""/g, '"'));
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.replace(/^"|"$/g, "").replace(/""/g, '"'));
  return result;
}

function parseCSVLineWithContinuation(
  lines: string[],
  startIdx: number
): { values: string[]; nextIndex: number } {
  let combined = lines[startIdx]!;
  let i = startIdx;
  let quoteCount = (combined.match(/"/g) || []).length;
  while (quoteCount % 2 !== 0 && i + 1 < lines.length) {
    i++;
    combined += "\n" + lines[i]!;
    quoteCount = (combined.match(/"/g) || []).length;
  }
  const values = parseCSVLine(combined);
  return { values, nextIndex: i + 1 };
}

function findColumn(
  row: Record<string, string>,
  aliases: string[]
): string | undefined {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const found = keys.find(
      (k) =>
        k.toLowerCase() === alias.toLowerCase() ||
        k.toLowerCase().includes(alias)
    );
    if (found) return row[found];
  }
  return undefined;
}

// =============================================================================
// NORMALIZE ROW → ROSTER ENTRY
// =============================================================================

function normalizeRow(
  row: Record<string, string>,
  rowIndex: number
): RosterEntry | string {
  const city = findColumn(row, CITY_ALIASES);
  const country = findColumn(row, COUNTRY_ALIASES);

  if (!city || !country) {
    const hasCountry = COUNTRY_ALIASES.some((a) =>
      Object.keys(row).some((k) => k.toLowerCase().includes(a))
    );
    const hasCity = CITY_ALIASES.some((a) =>
      Object.keys(row).some((k) => k.toLowerCase().includes(a))
    );
    if (!hasCountry || !hasCity) {
      return `Row ${rowIndex + 1}: Expected columns 'city' and 'country' (or 'state'/'region' + 'country'). Found: ${Object.keys(row).join(", ")}`;
    }
    return `Row ${rowIndex + 1}: Missing value for city or country`;
  }

  const cityTrim = city.trim();
  const countryTrim = country.trim();
  if (!cityTrim || !countryTrim) {
    return `Row ${rowIndex + 1}: Empty city or country`;
  }

  const geo = deriveGeo(cityTrim, countryTrim);
  if (!geo.country_code) {
    return `Row ${rowIndex + 1}: Unknown country "${countryTrim}"`;
  }

  return {
    city: cityTrim,
    country: countryTrim,
    country_code: geo.country_code,
    timezone: geo.timezone,
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}

// =============================================================================
// LOAD ROSTER
// =============================================================================

/**
 * Load roster from data/roster.csv.
 * Two columns: city, country (or state/region + country).
 * Auto-derives country_code, timezone, lat/long.
 */
export async function loadRoster(
  options: RosterLoadOptions = {}
): Promise<RosterLoadResult> {
  const { path: overridePath } = options;
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const projectRoot = process.cwd();
  const csvPath = overridePath
    ? path.join(projectRoot, overridePath)
    : path.join(projectRoot, "data", "roster.csv");

  const errors: string[] = [];
  let rawRows: Record<string, string>[] = [];

  try {
    const content = await fs.readFile(csvPath, "utf-8");
    rawRows = parseCSV(content);
    if (rawRows.length === 0) {
      return {
        entries: [],
        errors: ["CSV is empty or has no data rows."],
        source: "csv",
      };
    }
  } catch (err) {
    return {
      entries: [],
      errors: [
        `Could not read roster file: ${(err as Error).message}. Place data/roster.csv in project root.`,
      ],
      source: "csv",
    };
  }

  const entries: RosterEntry[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const result = normalizeRow(rawRows[i]!, i);
    if (typeof result === "string") {
      errors.push(result);
    } else {
      entries.push(result);
    }
  }

  return { entries, errors, source: "csv" };
}

/**
 * Synchronous load (for server contexts).
 */
export function loadRosterSync(options: RosterLoadOptions = {}): RosterLoadResult {
  const { path: overridePath } = options;
  const fs = require("node:fs");
  const path = require("node:path");

  const projectRoot = process.cwd();
  const csvPath = overridePath
    ? path.join(projectRoot, overridePath)
    : path.join(projectRoot, "data", "roster.csv");

  const errors: string[] = [];

  try {
    if (!fs.existsSync(csvPath)) {
      return {
        entries: [],
        errors: ["No roster file found. Place data/roster.csv in project root."],
        source: "csv",
      };
    }

    const content = fs.readFileSync(csvPath, "utf-8");
    const rawRows = parseCSV(content);
    if (rawRows.length === 0) {
      return {
        entries: [],
        errors: ["CSV is empty or has no data rows."],
        source: "csv",
      };
    }

    const entries: RosterEntry[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const result = normalizeRow(rawRows[i]!, i);
      if (typeof result === "string") {
        errors.push(result);
      } else {
        entries.push(result);
      }
    }

    return { entries, errors, source: "csv" };
  } catch (err) {
    return {
      entries: [],
      errors: [`Could not read roster file: ${(err as Error).message}`],
      source: "csv",
    };
  }
}
