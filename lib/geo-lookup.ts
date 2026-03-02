/**
 * Global Pulse — Geo lookup for roster entries
 *
 * Derives country_code, timezone, latitude, longitude from city + country.
 * Uses data/geo-lookup.json (curated for 19 priority countries + common regions).
 */

import geoData from "@/data/geo-lookup.json";

type GeoLookup = {
  countries: Record<string, string>;
  locations: Record<string, Record<string, [number, number, string]>>;
  country_defaults: Record<string, [number, number, string]>;
};

const lookup = geoData as GeoLookup;

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/\s+/g, " ");
}

/**
 * Derive country_code from country name.
 */
export function getCountryCode(country: string): string {
  const key = normalizeKey(country);
  return lookup.countries[key] ?? "";
}

/**
 * Derive geo data (lat, lng, timezone) from city/region + country.
 * Falls back to country capital if city not found.
 */
export function deriveGeo(
  city: string,
  country: string
): { country_code: string; latitude: number; longitude: number; timezone: string } {
  const countryCode = getCountryCode(country);
  if (!countryCode) {
    return {
      country_code: "",
      latitude: 0,
      longitude: 0,
      timezone: "UTC",
    };
  }

  const cityKey = normalizeKey(city);
  const countryLocs = lookup.locations[countryCode];
  const defaultCoords = lookup.country_defaults[countryCode];

  if (countryLocs?.[cityKey]) {
    const [lat, lng, tz] = countryLocs[cityKey]!;
    return {
      country_code: countryCode,
      latitude: lat,
      longitude: lng,
      timezone: tz,
    };
  }

  // Try partial match (e.g. "Buenos Aires" in "Buenos Aires Province")
  if (countryLocs) {
    for (const [locKey, coords] of Object.entries(countryLocs)) {
      if (locKey.includes(cityKey) || cityKey.includes(locKey)) {
        const [lat, lng, tz] = coords;
        return {
          country_code: countryCode,
          latitude: lat,
          longitude: lng,
          timezone: tz,
        };
      }
    }
  }

  // Fallback to country default (capital)
  if (defaultCoords) {
    const [lat, lng, tz] = defaultCoords;
    return {
      country_code: countryCode,
      latitude: lat,
      longitude: lng,
      timezone: tz,
    };
  }

  return {
    country_code: countryCode,
    latitude: 0,
    longitude: 0,
    timezone: "UTC",
  };
}
