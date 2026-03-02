/**
 * Global Pulse — News/Events Scanner Tool (Phase 2.4)
 *
 * Queries NewsAPI.org and data/known-events.json, merges results,
 * uses LLM to classify NewsAPI headlines into event_type and severity.
 */

import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getCountryCode } from "@/lib/geo-lookup";

const NEWSAPI_URL = "https://newsapi.org/v2/top-headlines";
const CATEGORIES = ["general", "health", "science"] as const;
const SEVERITY_EMOJI: Record<string, string> = {
  low: "🟢 Low",
  moderate: "🟡 Moderate",
  high: "🟠 High",
  critical: "🔴 Critical",
};

interface NewsArticle {
  title: string;
  description: string | null;
  url: string | null;
  publishedAt: string;
  source: string;
}

interface KnownEvent {
  id?: string;
  title: string;
  description?: string;
  event_type: string;
  countries_affected?: string[];
  severity: string;
  recurring?: boolean;
  typical_dates?: string | null;
}

/** Resolve country query (name or code) to ISO 2-letter code */
function resolveCountryCode(query: string): string {
  const trimmed = query.trim();
  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return getCountryCode(trimmed);
}

/** Get human-readable country name from code */
function getCountryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Check if a recurring event is active based on typical_dates and current date */
function isRecurringEventActive(typicalDates: string | null | undefined): boolean {
  if (!typicalDates || typicalDates.trim() === "") return true;
  const s = typicalDates.toLowerCase();
  if (
    s.includes("ongoing") ||
    s.includes("year-round") ||
    s.includes("event-driven") ||
    s.includes("unpredictable")
  )
    return true;

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const monthsFound = monthNames
    .map((m, i) => (s.includes(m) ? i : -1))
    .filter((i) => i >= 0);
  if (monthsFound.length === 0) return true;

  const currentIdx = new Date().getMonth();
  const minM = Math.min(...monthsFound);
  const maxM = Math.max(...monthsFound);
  if (minM <= maxM) return currentIdx >= minM && currentIdx <= maxM;
  return currentIdx >= minM || currentIdx <= maxM;
}

/** Fetch NewsAPI top-headlines for a country and category */
async function fetchNewsApi(
  key: string,
  countryCode: string,
  category: string
): Promise<{ ok: boolean; articles?: NewsArticle[]; error?: string }> {
  const url = `${NEWSAPI_URL}?country=${countryCode.toLowerCase()}&category=${category}&pageSize=10&apiKey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    if (res.status === 429)
      return { ok: false, error: "NewsAPI rate limit exceeded. Please try again later." };
    if (!res.ok) {
      const text = await res.text();
      let errMsg = `NewsAPI returned ${res.status}`;
      try {
        const json = JSON.parse(text);
        errMsg = json.message ?? errMsg;
      } catch {
        if (text) errMsg = text.slice(0, 200);
      }
      return { ok: false, error: errMsg };
    }
    const data = (await res.json()) as { status?: string; articles?: unknown[]; message?: string };
    if (data.status !== "ok") {
      return { ok: false, error: data.message ?? "NewsAPI error" };
    }
    const articles = (data.articles ?? []).map((a: unknown) => {
      const row = (a ?? {}) as Record<string, unknown>;
      return {
      title: String(row.title ?? ""),
      description: row.description ? String(row.description) : null,
      url: row.url ? String(row.url) : null,
      publishedAt: String(row.publishedAt ?? ""),
      source: String((row.source as Record<string, unknown>)?.name ?? "Unknown"),
    };
    });
    return { ok: true, articles };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "NewsAPI request failed",
    };
  }
}

/** Classify news headlines using LLM into event_type and severity */
async function classifyHeadlines(
  headlines: { title: string; description: string | null }[]
): Promise<Array<{ event_type: string; severity: string }>> {
  if (headlines.length === 0) return [];

  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 1024,
    temperature: 0,
  });

  const list = headlines
    .map((h, i) => `${i + 1}. ${h.title}${h.description ? ` — ${h.description.slice(0, 150)}` : ""}`)
    .join("\n");

  const prompt = `Classify each news headline into event_type and severity.

Event types (use exactly): weather, political, conflict, celebration, infrastructure, public_health
Severity (use exactly): low, moderate, high, critical

Return a JSON array with one object per headline, same order. Each object: {"event_type": "...", "severity": "..."}

Headlines:
${list}

JSON array only, no other text:`;

  try {
    const response = await model.invoke([
      new SystemMessage("You are a situational awareness classifier. Output valid JSON only."),
      new HumanMessage(prompt),
    ]);
    const content = response.content?.toString() ?? "[]";
    const match = content.match(/\[[\s\S]*\]/);
    const jsonStr = match ? match[0] : "[]";
    const parsed = JSON.parse(jsonStr) as Array<{ event_type?: string; severity?: string }>;
    return parsed.map((p, i) => ({
      event_type: ["weather", "political", "conflict", "celebration", "infrastructure", "public_health"].includes(
        p.event_type ?? ""
      )
        ? (p.event_type as string)
        : "political",
      severity: ["low", "moderate", "high", "critical"].includes(p.severity ?? "")
        ? (p.severity as string)
        : "moderate",
    }));
  } catch {
    return headlines.map(() => ({ event_type: "political", severity: "moderate" }));
  }
}

/** Simple deduplication: if news and known event overlap, prefer news but use known severity as baseline */
function dedupeEvents(
  newsEvents: Array<Record<string, unknown>>,
  knownEvents: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];
  const knownTitles = new Set(knownEvents.map((e) => (e.title as string).toLowerCase()));

  for (const n of newsEvents) {
    const titleLower = (n.title as string).toLowerCase();
    const overlapping = knownEvents.find((k) => {
      const kTitle = (k.title as string).toLowerCase();
      const words = kTitle.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => titleLower.includes(w)) || titleLower.includes(kTitle.slice(0, 20));
    });
    if (overlapping) {
      const knownSev = overlapping.severity as string;
      const newsSev = n.severity as string;
      const order = ["low", "moderate", "high", "critical"];
      const baselineHigher =
        order.indexOf(knownSev) > order.indexOf(newsSev);
      if (baselineHigher) {
        n.severity = overlapping.severity;
        n.severity_emoji = SEVERITY_EMOJI[knownSev] ?? "🟡 Moderate";
      }
    }
    result.push(n);
  }

  for (const k of knownEvents) {
    const kTitle = (k.title as string).toLowerCase();
    const coveredByNews = result.some((n) => {
      const nTitle = (n.title as string).toLowerCase();
      const words = kTitle.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => nTitle.includes(w));
    });
    if (!coveredByNews) result.push(k);
  }

  return result;
}

export function createNewsScannerTool() {
  return new DynamicStructuredTool({
    name: "news_scanner",
    description:
      "Scan news and known events for a country. Use for: What's happening in [country]? Any news or events affecting [country]? Returns current headlines (from NewsAPI) and known recurring/ongoing events (from seed data), with event_type and severity. Categories: weather, political, conflict, celebration, infrastructure, public_health.",
    schema: z.object({
      country: z
        .string()
        .describe("Country name (e.g. South Africa, Brazil) or ISO 2-letter code (e.g. ZA, BR)"),
    }),
    func: async ({ country }) => {
      const key = process.env.NEWS_API_KEY;
      const countryCode = resolveCountryCode(country);
      const countryName = getCountryName(countryCode);

      if (!countryCode) {
        return JSON.stringify({
          error: `Could not resolve country: "${country}". Use a country name or ISO 2-letter code (e.g. ZA, US).`,
        });
      }

      if (!key) {
        return JSON.stringify({
          error: "NEWS_API_KEY is not configured. News scanning is unavailable.",
        });
      }

      const events: Array<Record<string, unknown>> = [];

      // Source 1: NewsAPI — one request per category for efficiency
      const allArticles: NewsArticle[] = [];
      for (const cat of CATEGORIES) {
        const { ok, articles, error } = await fetchNewsApi(key, countryCode, cat);
        if (ok && articles) {
          allArticles.push(...articles);
        }
      }

      const seenUrls = new Set<string>();
      const uniqueArticles = allArticles.filter((a) => {
        const u = a.url ?? a.title;
        if (seenUrls.has(u)) return false;
        seenUrls.add(u);
        return a.title?.trim();
      });

      if (uniqueArticles.length > 0) {
        const classifications = await classifyHeadlines(
          uniqueArticles.map((a) => ({ title: a.title, description: a.description }))
        );
        uniqueArticles.forEach((a, i) => {
          const c = classifications[i] ?? { event_type: "political", severity: "moderate" };
          events.push({
            title: a.title,
            description: a.description ?? a.title,
            event_type: c.event_type,
            severity: c.severity,
            severity_emoji: SEVERITY_EMOJI[c.severity] ?? "🟡 Moderate",
            source: "newsapi",
            url: a.url ?? undefined,
            recency: a.publishedAt,
          });
        });
      }

      // Source 2: Known events
      let knownEvents: KnownEvent[] = [];
      try {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const content = await fs.readFile(
          path.join(process.cwd(), "data", "known-events.json"),
          "utf-8"
        );
        knownEvents = JSON.parse(content) as KnownEvent[];
      } catch {
        // continue without known events
      }

      const matchingKnown = knownEvents.filter((e) => {
        const codes = e.countries_affected ?? [];
        if (!codes.includes(countryCode)) return false;
        if (!e.recurring) return true;
        return isRecurringEventActive(e.typical_dates);
      });

      const knownAsEvents = matchingKnown.map((e) => ({
        title: e.title,
        description: e.description ?? e.title,
        event_type: e.event_type,
        severity: e.severity,
        severity_emoji: SEVERITY_EMOJI[e.severity] ?? "🟡 Moderate",
        source: "known_events",
        url: undefined,
        recency: "Ongoing / recurring",
      }));

      const merged = dedupeEvents(
        events,
        knownAsEvents
      );

      return JSON.stringify({
        country_queried: countryName,
        country_code: countryCode,
        events_count: merged.length,
        events: merged,
      });
    },
  });
}
