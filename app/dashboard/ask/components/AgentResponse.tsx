"use client";

/**
 * Global Pulse — AgentResponse (Phase 4.3)
 * Renders agent text. Inline SeverityBadge when severity levels mentioned.
 * Formats consultant counts and city breakdowns as readable blocks.
 */

import { useMemo } from "react";
import { SeverityBadge } from "@/app/components/SeverityBadge";

const SEVERITY_PATTERNS: Array<{
  pattern: RegExp;
  severity: "low" | "moderate" | "high" | "critical";
}> = [
  { pattern: /🟢\s*Low|(?:^|\s)Low\s*(?:—|–|-|:)/gi, severity: "low" },
  { pattern: /🟡\s*Moderate|(?:^|\s)Moderate\s*(?:—|–|-|:)/gi, severity: "moderate" },
  { pattern: /🟠\s*High|(?:^|\s)High\s*(?:—|–|-|:)/gi, severity: "high" },
  { pattern: /🔴\s*Critical|(?:^|\s)Critical\s*(?:—|–|-|:)/gi, severity: "critical" },
];

interface Segment {
  type: "text" | "severity";
  content: string;
  severity?: "low" | "moderate" | "high" | "critical";
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest: { index: number; severity: string; match: string } | null = null;

    for (const { pattern, severity } of SEVERITY_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      const m = remaining.match(regex);
      if (m) {
        const idx = remaining.indexOf(m[0]!);
        if (earliest === null || idx < earliest.index) {
          earliest = { index: idx, severity, match: m[0]! };
        }
      }
    }

    if (earliest === null) {
      segments.push({ type: "text", content: remaining });
      break;
    }

    if (earliest.index > 0) {
      segments.push({
        type: "text",
        content: remaining.slice(0, earliest.index),
      });
    }
    segments.push({
      type: "severity",
      content: earliest.match,
      severity: earliest.severity as Segment["severity"],
    });
    remaining = remaining.slice(earliest.index + earliest.match.length);
  }

  return segments;
}

export function AgentResponse({ content }: { content: string }) {
  const rendered = useMemo(() => {
    const segments = parseSegments(content);
    const hasSeverity = segments.some((s) => s.type === "severity");

    if (hasSeverity) {
      const parts: React.ReactNode[] = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!;
        if (seg.type === "severity" && seg.severity) {
          parts.push(
            <SeverityBadge
              key={i}
              severity={seg.severity}
              size="sm"
              className="inline-flex align-middle mx-0.5"
            />
          );
        } else if (seg.type === "text" && seg.content) {
          parts.push(
            <span key={i} className="whitespace-pre-wrap">
              {seg.content}
            </span>
          );
        }
      }
      return <span className="inline">{parts}</span>;
    }

    const blocks = content.split(/\n\n+/);
    return (
      <div className="space-y-2">
        {blocks.map((block, i) => {
          const trimmed = block.trim();
          const lines = trimmed.split("\n");
          const looksStructured =
            trimmed.includes("**") ||
            trimmed.match(/\d+\s+consultant/i) ||
            trimmed.match(/\d+\s*\([^)]+\)/i) ||
            (lines.length >= 2 && lines.some((l) => l.includes(":")));

          if (looksStructured && lines.length >= 2) {
            const formatted = lines
              .map((l) => l.replace(/\*\*([^*]+)\*\*/g, "$1"))
              .join("\n");
            return (
              <pre
                key={i}
                className="whitespace-pre-wrap font-sans text-sm bg-brand-pale-lavender rounded px-2 py-1 my-1 border border-brand-light-gray-violet text-brand-dark-bg"
              >
                {formatted}
              </pre>
            );
          }
          return (
            <p key={i} className="whitespace-pre-wrap">
              {block}
            </p>
          );
        })}
      </div>
    );
  }, [content]);

  return rendered;
}
