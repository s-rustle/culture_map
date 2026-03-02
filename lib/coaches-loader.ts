/**
 * Global Pulse — Coaches Data Ingestion (Amendment 1)
 *
 * Loads coach profiles from data/coaches.json.
 * Schema: name, email, timezone, is_admin
 */

import type { Coach } from "./types";

export interface CoachLoadResult {
  coaches: Omit<Coach, "id">[];
  errors: string[];
}

async function loadCoachesJson(path: string): Promise<unknown> {
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(path, "utf-8");
  return JSON.parse(content);
}

function loadCoachesJsonSync(path: string): unknown {
  const fs = require("node:fs");
  const content = fs.readFileSync(path, "utf-8");
  return JSON.parse(content);
}

function normalizeCoach(raw: unknown, index: number): Omit<Coach, "id"> | string {
  if (typeof raw !== "object" || raw === null) {
    return `Row ${index + 1}: Invalid coach record`;
  }
  const obj = raw as Record<string, unknown>;
  const name = String(obj.name ?? "").trim();
  const email = String(obj.email ?? "").trim();
  const timezone = String(obj.timezone ?? "").trim();
  const isAdmin = obj.is_admin === true || obj.is_admin === "true";

  if (!name) return `Coach ${index + 1}: Missing name`;
  if (!email) return `Coach ${index + 1}: Missing email`;
  if (!timezone) return `Coach ${index + 1}: Missing timezone`;

  return { name, email, timezone, is_admin: isAdmin };
}

/**
 * Load coaches from data/coaches.json.
 * Assigns ids by array index (1-based) for use before DB sync.
 */
export async function loadCoaches(): Promise<CoachLoadResult> {
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  const projectRoot = process.cwd();
  const coachesPath = path.join(projectRoot, "data", "coaches.json");

  const errors: string[] = [];
  try {
    const data = await loadCoachesJson(coachesPath);
    const arr = Array.isArray(data) ? data : [data];
    const coaches: Omit<Coach, "id">[] = [];
    for (let i = 0; i < arr.length; i++) {
      const result = normalizeCoach(arr[i], i);
      if (typeof result === "string") {
        errors.push(result);
      } else {
        coaches.push(result);
      }
    }
    return { coaches, errors };
  } catch (err) {
    return {
      coaches: [],
      errors: [`Could not load coaches: ${(err as Error).message}. Place data/coaches.json.`],
    };
  }
}

export function loadCoachesSync(): CoachLoadResult {
  const path = require("node:path");
  const fs = require("node:fs");
  const projectRoot = process.cwd();
  const coachesPath = path.join(projectRoot, "data", "coaches.json");

  const errors: string[] = [];
  try {
    const fallbackPath = path.join(projectRoot, "data", "coaches-schema-example.json");
    const targetPath = fs.existsSync(coachesPath)
      ? coachesPath
      : fallbackPath;
    if (!fs.existsSync(targetPath)) {
      return {
        coaches: [],
        errors: ["No coaches file found. Place data/coaches.json or data/coaches-schema-example.json."],
      };
    }
    const data = loadCoachesJsonSync(targetPath);
    const arr = Array.isArray(data) ? data : [data];
    const coaches: Omit<Coach, "id">[] = [];
    for (let i = 0; i < arr.length; i++) {
      const result = normalizeCoach(arr[i], i);
      if (typeof result === "string") {
        errors.push(result);
      } else {
        coaches.push(result);
      }
    }
    return { coaches, errors };
  } catch (err) {
    return {
      coaches: [],
      errors: [`Could not load coaches: ${(err as Error).message}`],
    };
  }
}
