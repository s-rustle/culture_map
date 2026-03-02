"use client";

/**
 * Global Pulse — SituationCard (Phase 3.3)
 * Displays one situation: severity badge, title, country, summary, affected count, event type, time since detection.
 */

import { ChevronRight } from "lucide-react";
import { SeverityBadge } from "@/app/components/SeverityBadge";
import type { Situation } from "@/lib/types";

function formatTimeSince(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatEventType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface SituationCardProps {
  situation: Situation;
}

export function SituationCard({ situation }: SituationCardProps) {
  const location = [situation.city, situation.region, situation.country]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="rounded-lg border border-brand-light-gray-violet bg-white p-4 hover:border-brand-medium-gray-violet transition-colors">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={situation.severity} size="sm" />
          <span className="text-xs font-medium text-brand-medium-gray-violet uppercase tracking-wide">
            {formatEventType(situation.event_type)}
          </span>
          <span className="text-sm text-brand-charcoal-violet ml-auto">
            {formatTimeSince(situation.first_detected_at)}
          </span>
        </div>

        <h3 className="font-semibold text-brand-dark-bg text-base leading-tight">
          {situation.title}
        </h3>

        <p className="text-sm text-brand-charcoal-violet line-clamp-2">
          {situation.summary}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-sm text-brand-medium-gray-violet">
            <span>{location || situation.country}</span>
            {situation.affected_consultant_count > 0 && (
              <span className="font-medium text-brand-dark-bg">
                {situation.affected_consultant_count} consultant
                {situation.affected_consultant_count !== 1 ? "s" : ""} affected
              </span>
            )}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline"
          >
            View Details
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
