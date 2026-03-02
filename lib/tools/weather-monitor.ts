/**
 * Global Pulse — Weather Monitor Tool (Phase 2.3)
 *
 * LangChain tool that fetches weather and alerts from OpenWeatherMap API.
 * Uses Geocoding API for location lookup, One Call API 3.0 for alerts + conditions,
 * with Current API fallback when One Call is unavailable.
 * For country-level queries, checks major cities where consultants exist (from roster).
 */

import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { loadRoster } from "@/lib/roster-loader";

const MAX_CITIES_PER_COUNTRY = 3;
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";
const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";

/** Map OpenWeatherMap alert severity to Global Pulse severity */
function mapSeverity(apiSeverity: string | undefined, event?: string): string {
  const s = (apiSeverity ?? "").toLowerCase();
  const e = (event ?? "").toLowerCase();
  const combined = `${s} ${e}`;
  if (
    combined.includes("extreme") ||
    combined.includes("catastrophic") ||
    combined.includes("major")
  )
    return "🔴 Critical";
  if (combined.includes("severe")) return "🟠 High";
  if (combined.includes("moderate")) return "🟡 Moderate";
  return "🟢 Low";
}

interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
  country?: string;
}

/** Geocode city/country to lat, lon */
async function geocode(
  key: string,
  query: string
): Promise<{ ok: boolean; data?: GeocodeResult[]; error?: string }> {
  const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=1&appid=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    if (res.status === 429)
      return { ok: false, error: "Weather API rate limit exceeded. Please try again later." };
    if (!res.ok) {
      const text = await res.text();
      let errMsg = `Geocoding API returned ${res.status}`;
      try {
        const json = JSON.parse(text);
        errMsg = json.message ?? errMsg;
      } catch {
        if (text) errMsg = text.slice(0, 200);
      }
      return { ok: false, error: errMsg };
    }
    const data = (await res.json()) as GeocodeResult[];
    if (!Array.isArray(data) || data.length === 0)
      return { ok: false, error: `Location "${query}" not found.` };
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Geocoding request failed",
    };
  }
}

/** Fetch One Call API 3.0 (current + alerts). Returns null if unavailable (e.g. subscription required). */
async function fetchOneCall(
  key: string,
  lat: number,
  lon: number
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const url = `${ONECALL_URL}?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(key)}&units=metric`;
  try {
    const res = await fetch(url);
    if (res.status === 429)
      return { ok: false, error: "Weather API rate limit exceeded. Please try again later." };
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "One Call API requires a subscription. Using current weather only." };
    if (res.status === 402)
      return { ok: false, error: "One Call API subscription required. Using current weather only." };
    if (!res.ok) {
      const text = await res.text();
      let errMsg = `One Call API returned ${res.status}`;
      try {
        const json = JSON.parse(text);
        errMsg = json.message ?? errMsg;
      } catch {
        if (text) errMsg = text.slice(0, 200);
      }
      return { ok: false, error: errMsg };
    }
    const data = (await res.json()) as Record<string, unknown>;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "One Call API request failed",
    };
  }
}

/** Fetch Current weather (fallback when One Call unavailable) */
async function fetchCurrent(
  key: string,
  lat: number,
  lon: number
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const url = `${CURRENT_URL}?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(key)}&units=metric`;
  try {
    const res = await fetch(url);
    if (res.status === 429)
      return { ok: false, error: "Weather API rate limit exceeded. Please try again later." };
    if (!res.ok) {
      const text = await res.text();
      let errMsg = `Current API returned ${res.status}`;
      try {
        const json = JSON.parse(text);
        errMsg = json.message ?? errMsg;
      } catch {
        if (text) errMsg = text.slice(0, 200);
      }
      return { ok: false, error: errMsg };
    }
    const data = (await res.json()) as Record<string, unknown>;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Current API request failed",
    };
  }
}

/** Build current conditions summary from One Call or Current API response */
function buildCurrentSummary(data: Record<string, unknown>): string {
  const current = data.current as Record<string, unknown> | undefined;
  const main = data.main as Record<string, unknown> | undefined;
  const weatherFromCurrent = current?.weather;
  const weatherFromTop = data.weather;
  const weatherArr = Array.isArray(weatherFromCurrent)
    ? weatherFromCurrent
    : Array.isArray(weatherFromTop)
      ? weatherFromTop
      : [];
  const weather = weatherArr[0] as Record<string, unknown> | undefined;
  const desc = weather?.description ?? "N/A";
  const temp = current?.temp ?? main?.temp ?? "?";
  const feels = current?.feels_like ?? main?.feels_like ?? "?";
  const humidity = current?.humidity ?? main?.humidity ?? "?";
  return `${desc}, ${temp}°C (feels like ${feels}°C), humidity ${humidity}%`;
}

/** Build structured output from One Call or Current API response */
function buildOutput(
  locationName: string,
  data: Record<string, unknown>,
  overallSeverity: string,
  fromCurrentOnly = false
): Record<string, unknown> {
  const locDisplay = locationName;

  let alertList: Array<Record<string, unknown>> = [];
  if (!fromCurrentOnly) {
    const alertsData = data.alerts;
    if (Array.isArray(alertsData)) alertList = alertsData;
    else if (alertsData && typeof alertsData === "object" && "alerts" in alertsData)
      alertList = (alertsData as { alerts: unknown[] }).alerts ?? [];
  }

  const alerts = alertList.map((a) => {
    const event = a.event ?? a.headline ?? "Alert";
    const severity = mapSeverity(a.severity as string, event as string);
    const desc = (a.description ?? a.desc ?? a.headline ?? "").toString().slice(0, 300);
    const end = a.end;
    const start = a.start;
    let expected_duration = "Unknown";
    if (end && typeof end === "number")
      expected_duration = `Until ${new Date(end * 1000).toISOString()}`;
    else if (start && typeof start === "number")
      expected_duration = `From ${new Date(start * 1000).toISOString()}`;
    return {
      type: event,
      severity,
      description: desc,
      expected_duration,
    };
  });

  const currentSummary = buildCurrentSummary(data);

  return {
    location_checked: locDisplay,
    overall_severity: overallSeverity,
    current_conditions: currentSummary,
    active_alerts_count: alertList.length,
    alerts: alerts.length > 0 ? alerts : undefined,
    note:
      alertList.length === 0
        ? fromCurrentOnly
          ? "No active weather alerts (One Call API required for alerts)."
          : "No active weather alerts."
        : undefined,
  };
}

/** Main fetch: geocode, try One Call, fallback to Current */
async function fetchWeather(
  key: string,
  query: string
): Promise<{ ok: boolean; data?: Record<string, unknown>; locDisplay?: string; error?: string }> {
  const geo = await geocode(key, query);
  if (!geo.ok || !geo.data?.[0]) {
    return { ok: false, error: geo.error ?? "Geocoding failed" };
  }
  const { lat, lon, name, country } = geo.data[0];
  const locDisplay = country ? `${name}, ${country}` : name;

  const oneCall = await fetchOneCall(key, lat, lon);
  if (oneCall.ok && oneCall.data) {
    return { ok: true, data: oneCall.data, locDisplay };
  }

  const current = await fetchCurrent(key, lat, lon);
  if (current.ok && current.data) {
    current.data.name = name;
    (current.data as Record<string, unknown>).sys = { country };
    return { ok: true, data: current.data, locDisplay };
  }

  return {
    ok: false,
    error: current.error ?? oneCall.error ?? "Failed to fetch weather",
  };
}

export function createWeatherMonitorTool() {
  return new DynamicStructuredTool({
    name: "weather_monitor",
    description:
      "Get weather conditions and active alerts for a city or country. Use for: What's the weather in [city]? Any weather alerts in [country]? For country queries, checks major cities where consultants are located. Returns current conditions, any active alerts with severity (🟢 Low / 🟡 Moderate / 🟠 High / 🔴 Critical), and recommended actions.",
    schema: z.object({
      city: z.string().optional().describe("City name (e.g. São Paulo, Bogota)"),
      country: z.string().optional().describe("Country name (e.g. Brazil, Colombia)"),
    }),
    func: async ({ city, country }) => {
      const key = process.env.WEATHER_API_KEY;
      if (!key) {
        return JSON.stringify({
          error: "WEATHER_API_KEY is not configured. Weather data is unavailable.",
        });
      }

      const fromCurrentOnly = (d: Record<string, unknown>) => !("alerts" in d && d.alerts);

      // Both provided: "City, Country"
      if (city?.trim() && country?.trim()) {
        const q = `${city.trim()}, ${country.trim()}`;
        const { ok, data, locDisplay, error } = await fetchWeather(key, q);
        if (!ok || !data) {
          return JSON.stringify({
            location_checked: q,
            error: error ?? "Failed to fetch weather",
          });
        }
        const alertList = Array.isArray(data.alerts) ? data.alerts : [];
        const maxSev = alertList.reduce(
          (best: string, a: Record<string, unknown>) => {
            const s = mapSeverity(a.severity as string, a.event as string);
            const order = ["🟢 Low", "🟡 Moderate", "🟠 High", "🔴 Critical"];
            return order.indexOf(s) > order.indexOf(best) ? s : best;
          },
          "🟢 Low"
        );
        return JSON.stringify(
          buildOutput(locDisplay ?? q, data, alertList.length > 0 ? maxSev : "🟢 Low", fromCurrentOnly(data))
        );
      }

      // City only
      if (city?.trim()) {
        const { ok, data, locDisplay, error } = await fetchWeather(key, city.trim());
        if (!ok || !data) {
          return JSON.stringify({
            location_checked: city.trim(),
            error: error ?? "Failed to fetch weather",
          });
        }
        const alertList = Array.isArray(data.alerts) ? data.alerts : [];
        const maxSev = alertList.reduce(
          (best: string, a: Record<string, unknown>) => {
            const s = mapSeverity(a.severity as string, a.event as string);
            const order = ["🟢 Low", "🟡 Moderate", "🟠 High", "🔴 Critical"];
            return order.indexOf(s) > order.indexOf(best) ? s : best;
          },
          "🟢 Low"
        );
        return JSON.stringify(
          buildOutput(locDisplay ?? city.trim(), data, alertList.length > 0 ? maxSev : "🟢 Low", fromCurrentOnly(data))
        );
      }

      // Country only: use roster to get major cities
      if (country?.trim()) {
        const { entries } = await loadRoster({ path: "data/roster.csv" });
        const inCountry = entries.filter(
          (e) =>
            e.country.toLowerCase() === country.trim().toLowerCase() ||
            e.country.toLowerCase().includes(country.trim().toLowerCase())
        );
        const byCity = new Map<string, number>();
        for (const e of inCountry) {
          if (e.city?.trim()) {
            byCity.set(e.city, (byCity.get(e.city) ?? 0) + 1);
          }
        }
        const topCities = Array.from(byCity.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, MAX_CITIES_PER_COUNTRY)
          .map(([c]) => c);

        if (topCities.length === 0) {
          const { ok, data, locDisplay, error } = await fetchWeather(key, country.trim());
          if (!ok) {
            return JSON.stringify({
              location_checked: country.trim(),
              error: error ?? "No consultant cities found and country lookup failed.",
            });
          }
          const d = data!;
          const alertList = Array.isArray(d.alerts) ? d.alerts : [];
          const maxSev = alertList.reduce(
            (best: string, a: Record<string, unknown>) => {
              const s = mapSeverity(a.severity as string, a.event as string);
              const order = ["🟢 Low", "🟡 Moderate", "🟠 High", "🔴 Critical"];
              return order.indexOf(s) > order.indexOf(best) ? s : best;
            },
            "🟢 Low"
          );
          return JSON.stringify(
            buildOutput(locDisplay ?? country.trim(), d, alertList.length > 0 ? maxSev : "🟢 Low", fromCurrentOnly(d))
          );
        }

        const results: Record<string, unknown>[] = [];
        let overallMax = "🟢 Low";
        for (const c of topCities) {
          const q = `${c}, ${country.trim()}`;
          const { ok, data, locDisplay, error } = await fetchWeather(key, q);
          if (!ok) {
            results.push({ location: q, error: error ?? "Fetch failed" });
            continue;
          }
          const d = data!;
          const alertList = Array.isArray(d.alerts) ? d.alerts : [];
          const maxSev = alertList.reduce(
            (best: string, a: Record<string, unknown>) => {
              const s = mapSeverity(a.severity as string, a.event as string);
              const order = ["🟢 Low", "🟡 Moderate", "🟠 High", "🔴 Critical"];
              return order.indexOf(s) > order.indexOf(best) ? s : best;
            },
            "🟢 Low"
          );
          if (
            ["🟢 Low", "🟡 Moderate", "🟠 High", "🔴 Critical"].indexOf(maxSev) >
            ["🟢 Low", "🟡 Moderate", "🟠 High", "🔴 Critical"].indexOf(overallMax)
          ) {
            overallMax = maxSev;
          }
          results.push(buildOutput(locDisplay ?? q, d, alertList.length > 0 ? maxSev : "🟢 Low", fromCurrentOnly(d)));
        }

        return JSON.stringify({
          country: country.trim(),
          overall_severity: overallMax,
          locations_checked: results.length,
          results,
        });
      }

      return JSON.stringify({
        error: "Provide at least one of: city, country. E.g. city='São Paulo' or country='Brazil'.",
      });
    },
  });
}
