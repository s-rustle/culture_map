/**
 * Global Pulse — Roster Lookup Tool (Phase 2.2)
 *
 * LangChain tool that queries the consultant roster by country, city, or region.
 * Returns count + city breakdown. No PII — roster has city and country only.
 */

import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { loadRoster } from "@/lib/roster-loader";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function createRosterLookupTool() {
  return new DynamicStructuredTool({
    name: "roster_lookup",
    description:
      "Look up consultant counts by location. Use for queries like: How many consultants in [country]? Who is in [city]? Which countries have consultants? Pass a country name (e.g. Brazil, Colombia), a city/region name (e.g. Kraków, Bogota), or 'all' to list all countries with counts.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "Country name, city/region name, or 'all' to get full country list with counts"
        ),
    }),
    func: async ({ query }) => {
      const { entries, errors } = await loadRoster({ path: "data/roster.csv" });
      if (errors.length > 0 && entries.length === 0) {
        return JSON.stringify({
          error: "Could not load roster",
          details: errors.slice(0, 3),
        });
      }

      const q = query.trim().toLowerCase();
      const qNorm = normalize(query.trim());

      // "all" or "countries" → list all countries with counts
      if (
        q === "all" ||
        q === "countries" ||
        q === "which countries" ||
        q === "list countries"
      ) {
        const byCountry = new Map<string, { count: number; cities: Map<string, number> }>();
        for (const e of entries) {
          const curr = byCountry.get(e.country) ?? {
            count: 0,
            cities: new Map<string, number>(),
          };
          curr.count += 1;
          const cityCount = curr.cities.get(e.city) ?? 0;
          curr.cities.set(e.city, cityCount + 1);
          byCountry.set(e.country, curr);
        }
        const result = Array.from(byCountry.entries()).map(([country, data]) => ({
          country,
          consultant_count: data.count,
          cities: Array.from(data.cities.entries()).map(([city, n]) => ({
            city,
            count: n,
          })),
        }));
        return JSON.stringify({
          total_consultants: entries.length,
          countries: result,
        });
      }

      // Try country match first
      const countries = [...new Set(entries.map((e) => e.country))];
      const countryMatch = countries.find(
        (c) => normalize(c) === qNorm || c.toLowerCase() === q
      );
      if (countryMatch) {
        const inCountry = entries.filter(
          (e) => normalize(e.country) === qNorm || e.country.toLowerCase() === q
        );
        const byCity = new Map<string, number>();
        for (const e of inCountry) {
          byCity.set(e.city, (byCity.get(e.city) ?? 0) + 1);
        }
        const cities = Array.from(byCity.entries()).map(([city, count]) => ({
          city,
          count,
        }));
        return JSON.stringify({
          query: query,
          match_type: "country",
          country: countryMatch,
          consultant_count: inCountry.length,
          cities,
        });
      }

      // Try city/region match (partial)
      const cityMatches = entries.filter(
        (e) =>
          normalize(e.city).includes(qNorm) ||
          qNorm.includes(normalize(e.city)) ||
          normalize(e.city) === qNorm
      );
      if (cityMatches.length > 0) {
        const byCity = new Map<string, { country: string; count: number }>();
        for (const e of cityMatches) {
          const key = `${e.city}, ${e.country}`;
          const curr = byCity.get(key);
          if (curr) curr.count += 1;
          else byCity.set(key, { country: e.country, count: 1 });
        }
        const cities = Array.from(byCity.entries()).map(([location, data]) => ({
          location,
          country: data.country,
          count: data.count,
        }));
        return JSON.stringify({
          query: query,
          match_type: "city",
          consultant_count: cityMatches.length,
          cities,
        });
      }

      return JSON.stringify({
        query: query,
        consultant_count: 0,
        message: `No consultants found for "${query}". Try a country name, city name, or "all" for full country list.`,
        hint: `Known countries include: ${countries.slice(0, 10).join(", ")}${countries.length > 10 ? "..." : ""}`,
      });
    },
  });
}
