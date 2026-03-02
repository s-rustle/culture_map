/**
 * Global Pulse — Screenshot render (Task 5.2)
 * Uses @vercel/og to render a simplified SituationCard as PNG for email embedding.
 * GET /api/screenshot/render?situation_id=123
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { sql, isDatabaseConfigured } from "@/lib/db";
import { brand, severityColors } from "@/lib/colors";

export const dynamic = "force-dynamic";

const severityEmoji: Record<string, string> = {
  low: "🟢",
  moderate: "🟡",
  high: "🟠",
  critical: "🔴",
};

const severityLabel: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const situationId = searchParams.get("situation_id");

  if (!situationId) {
    return new Response("Missing situation_id", { status: 400 });
  }

  let situation: {
    country: string;
    city?: string;
    region?: string;
    event_type: string;
    severity: string;
    title: string;
    summary: string;
    affected_consultant_count: number;
  } | null = null;

  if (isDatabaseConfigured() && sql) {
    try {
      const { rows } = await sql`
        SELECT country, city, region, event_type, severity, title, summary, affected_consultant_count
        FROM situations
        WHERE id = ${parseInt(situationId, 10)}
        LIMIT 1
      `;
      const row = rows[0] as Record<string, unknown> | undefined;
      situation = row
        ? {
            country: String(row.country ?? ""),
            city: row.city ? String(row.city) : undefined,
            region: row.region ? String(row.region) : undefined,
            event_type: String(row.event_type ?? ""),
            severity: String(row.severity ?? ""),
            title: String(row.title ?? ""),
            summary: String(row.summary ?? ""),
            affected_consultant_count: Number(row.affected_consultant_count ?? 0),
          }
        : null;
    } catch {
      situation = null;
    }
  }

  if (!situation) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: brand.lightBg,
            fontFamily: "system-ui",
          }}
        >
          <div style={{ fontSize: 18, color: brand.charcoalViolet }}>Situation not found</div>
        </div>
      ),
      { width: 600, height: 300 }
    );
  }

  const emoji = severityEmoji[situation.severity] ?? "🟡";
  const label = severityLabel[situation.severity] ?? "Moderate";
  const colors = severityColors[situation.severity as keyof typeof severityColors] ?? severityColors.moderate;
  const bg = colors.bg;
  const textColor = colors.text;
  const location = [situation.city, situation.region, situation.country]
    .filter(Boolean)
    .join(", ") || situation.country;
  const eventType = situation.event_type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: brand.lightBg,
          padding: 32,
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            paddingBottom: 12,
            borderBottom: `2px solid ${brand.accent}`,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 600, color: brand.darkBg }}>
            Global Pulse
          </span>
          <span style={{ fontSize: 12, color: brand.mediumGrayViolet }}>
            Situational awareness
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: brand.paleLavender,
            borderRadius: 12,
            border: `1px solid ${brand.lightGrayViolet}`,
            padding: 24,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: bg,
                color: textColor,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {emoji} {label}
            </div>
            <span
              style={{
                fontSize: 12,
                color: brand.mediumGrayViolet,
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              {eventType}
            </span>
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: brand.darkBg,
              marginBottom: 8,
              lineHeight: 1.3,
            }}
          >
            {situation.title}
          </div>

          <div
            style={{
              fontSize: 14,
              color: brand.charcoalViolet,
              marginBottom: 12,
            }}
          >
            {location}
          </div>

          <div
            style={{
              fontSize: 14,
              color: brand.darkIndigo,
              lineHeight: 1.5,
              marginBottom: 12,
              display: "flex",
              flex: 1,
            }}
          >
            {situation.summary.length > 200
              ? situation.summary.slice(0, 200) + "..."
              : situation.summary}
          </div>

          {situation.affected_consultant_count > 0 && (
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: brand.accent,
              }}
            >
              {situation.affected_consultant_count} consultant
              {situation.affected_consultant_count !== 1 ? "s" : ""} potentially
              affected
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 600,
      height: 400,
    }
  );
}
