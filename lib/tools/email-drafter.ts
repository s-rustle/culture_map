/**
 * Global Pulse — Email Notification Drafter Tool (Phase 2.5)
 *
 * Takes situation data, finds qualifying coach subscriptions,
 * creates draft notifications. Does NOT send emails.
 */

import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { sql, isDatabaseConfigured } from "@/lib/db";
import { getCountryCode } from "@/lib/geo-lookup";
import { loadRoster } from "@/lib/roster-loader";

const SEVERITY_ORDER = ["low", "moderate", "high", "critical"] as const;
const SEVERITY_EMOJI: Record<string, string> = {
  low: "🟢 Low",
  moderate: "🟡 Moderate",
  high: "🟠 High",
  critical: "🔴 Critical",
};

/** Returns true if severity a >= severity b (meets or exceeds) */
function severityMeetsOrExceeds(a: string, b: string): boolean {
  const ai = SEVERITY_ORDER.indexOf(a.toLowerCase() as (typeof SEVERITY_ORDER)[number]);
  const bi = SEVERITY_ORDER.indexOf(b.toLowerCase() as (typeof SEVERITY_ORDER)[number]);
  if (ai < 0 || bi < 0) return false;
  return ai >= bi;
}

/** Parse event_types from DB (stored as JSON text) */
function parseEventTypes(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Build body_html for the notification */
function buildBodyHtml(
  summary: string,
  affectedCount: number,
  severity: string,
  citiesBreakdown?: Array<{ city: string; count: number }>,
  isUrgent?: boolean
): string {
  const severityLabel = SEVERITY_EMOJI[severity.toLowerCase()] ?? severity;
  let html = `<p><strong>Severity:</strong> ${severityLabel}</p>`;
  html += `<p><strong>Consultants affected:</strong> ${affectedCount}</p>`;
  if (citiesBreakdown && citiesBreakdown.length > 0) {
    html += `<p><strong>By location:</strong></p><ul>`;
    for (const { city, count } of citiesBreakdown) {
      html += `<li>${city}: ${count}</li>`;
    }
    html += `</ul>`;
  }
  html += `<p><strong>Summary:</strong></p><p>${summary}</p>`;
  html += `<p><strong>Recommended action:</strong> Check in with affected consultants, confirm safety, and adjust deadlines if needed.</p>`;
  if (isUrgent) {
    html += `<p><em>⚠️ Urgent — Critical severity. Auto-send may apply per Phase 5 policy.</em></p>`;
  }
  return html;
}

export function createEmailDrafterTool() {
  return new DynamicStructuredTool({
    name: "email_drafter",
    description:
      "Draft alert emails for coaches based on a situation. Use when: Draft notifications for [situation]. Create alert emails for [country] [event]. Finds coaches subscribed to the country and event type, creates draft notifications (status=draft) for admin approval. Does NOT send emails. Requires: country, event_type, severity, title, summary, affected_consultant_count.",
    schema: z.object({
      country: z.string().describe("Country name or ISO code (e.g. Brazil, BR)"),
      event_type: z
        .string()
        .describe("Event type: weather, political, conflict, celebration, infrastructure, public_health"),
      severity: z
        .string()
        .describe("Severity: low, moderate, high, critical"),
      title: z.string().describe("Situation title (e.g. Flooding in Recife, Brazil)"),
      summary: z.string().describe("Situation summary for the email body"),
      affected_consultant_count: z.number().describe("Number of consultants affected"),
      city: z.string().optional().describe("City or region for subject (e.g. Recife)"),
    }),
    func: async ({
      country,
      event_type,
      severity,
      title,
      summary,
      affected_consultant_count,
      city,
    }) => {
      if (!isDatabaseConfigured() || !sql) {
        return JSON.stringify({
          error: "Database is not configured. Cannot create draft notifications.",
        });
      }

      const countryCode = country.trim().length === 2
        ? country.trim().toUpperCase()
        : getCountryCode(country.trim());
      if (!countryCode) {
        return JSON.stringify({
          error: `Could not resolve country: "${country}". Use country name or ISO 2-letter code.`,
        });
      }

      const countryName =
        country.trim().length === 2
          ? (() => {
              try {
                return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
              } catch {
                return countryCode;
              }
            })()
          : country.trim();

      try {
        const subscriptionsResult = await sql`
          SELECT cs.coach_id, cs.country_code, cs.event_types, cs.min_severity, c.name, c.email
          FROM coach_subscriptions cs
          JOIN coaches c ON c.id = cs.coach_id
          WHERE cs.country_code = ${countryCode}
        `;

        const qualifying: Array<{ coach_id: number; name: string; email: string }> = [];
        for (const row of subscriptionsResult.rows) {
          const r = row as { event_types: string; min_severity?: string; coach_id: number; name: string; email: string };
          const eventTypes = parseEventTypes(r.event_types);
          if (!eventTypes.includes(event_type)) continue;
          if (!severityMeetsOrExceeds(severity, r.min_severity ?? "moderate")) continue;
          qualifying.push({
            coach_id: r.coach_id,
            name: String(r.name ?? ""),
            email: String(r.email ?? ""),
          });
        }

        if (qualifying.length === 0) {
          return JSON.stringify({
            message:
              "No coaches are subscribed to this country and event type. Add coaches and coach_subscriptions to receive drafts.",
            country_code: countryCode,
            country: countryName,
            event_type,
            severity,
            qualifying_count: 0,
          });
        }

        const cityLabel = city?.trim() ? `${city.trim()}, ` : "";
        const severityEmoji = SEVERITY_EMOJI[severity.toLowerCase()] ?? "🟡 Moderate";
        const subject = `[${severityEmoji}] ${title} — ${affected_consultant_count} consultants in area`;

        let citiesBreakdown: Array<{ city: string; count: number }> | undefined;
        try {
          const { entries } = await loadRoster({ path: "data/roster.csv" });
          const inCountry = entries.filter(
            (e) => e.country_code === countryCode || e.country.toLowerCase() === countryName.toLowerCase()
          );
          const byCity = new Map<string, number>();
          for (const e of inCountry) {
            if (e.city?.trim()) {
              byCity.set(e.city, (byCity.get(e.city) ?? 0) + 1);
            }
          }
          citiesBreakdown = Array.from(byCity.entries())
            .map(([cityName, count]) => ({ city: cityName, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        } catch {
          // continue without city breakdown
        }

        const isUrgent = severity.toLowerCase() === "critical";
        const bodyHtml = buildBodyHtml(
          summary,
          affected_consultant_count,
          severity,
          citiesBreakdown,
          isUrgent
        );

        const situationResult = await sql`
          INSERT INTO situations (
            country_code, country, city, event_type, severity, title, summary,
            affected_consultant_count, status
          )
          VALUES (
            ${countryCode}, ${countryName}, ${city ?? null}, ${event_type}, ${severity.toLowerCase()},
            ${title}, ${summary}, ${affected_consultant_count}, 'active'
          )
          RETURNING id
        `;
        const situationId = (situationResult.rows[0] as { id: number } | undefined)?.id;

        const created: Array<{ coach_name: string; subject: string }> = [];
        for (const q of qualifying) {
          await sql`
            INSERT INTO notifications (
              situation_id, coach_id, email_type, subject, body_html, status
            )
            VALUES (${situationId}, ${q.coach_id}, 'alert', ${subject}, ${bodyHtml}, 'draft')
          `;
          created.push({
            coach_name: q.name,
            subject,
          });
        }

        return JSON.stringify({
          message: `Created ${created.length} draft notification(s) for admin approval.`,
          draft_count: created.length,
          coaches: created.map((c) => c.coach_name),
          subjects: created.map((c) => c.subject),
          situation_id: situationId,
          urgent: isUrgent,
          note: isUrgent
            ? "🔴 Critical severity — drafts flagged for urgent review. Auto-send may apply per Phase 5."
            : undefined,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return JSON.stringify({
          error: "Database error while creating draft notifications.",
          details: msg.slice(0, 200),
        });
      }
    },
  });
}
