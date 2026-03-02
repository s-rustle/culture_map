"use client";

/**
 * Global Pulse — SituationList (Phase 3.4)
 * Sorted list of SituationCards. Filter by country, severity, event type.
 */

import { useMemo, useState } from "react";
import { SituationCard } from "./SituationCard";
import type { Situation } from "@/lib/types";
import type { SeverityLevel } from "@/lib/types";

const SEVERITY_ORDER: SeverityLevel[] = ["critical", "high", "moderate", "low"];

function sortSituations(situations: Situation[]): Situation[] {
  return [...situations].sort((a, b) => {
    const aIdx = SEVERITY_ORDER.indexOf(a.severity);
    const bIdx = SEVERITY_ORDER.indexOf(b.severity);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return new Date(b.first_detected_at).getTime() - new Date(a.first_detected_at).getTime();
  });
}

interface SituationListProps {
  situations: Situation[];
  loading?: boolean;
}

export function SituationList({ situations, loading }: SituationListProps) {
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");

  const { sorted, countries, severities, eventTypes } = useMemo(() => {
    const countries = [...new Set(situations.map((s) => s.country_code))].sort();
    const severities = [...new Set(situations.map((s) => s.severity))].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b)
    );
    const eventTypes = [...new Set(situations.map((s) => s.event_type))].sort();

    const filtered = situations.filter((s) => {
      if (countryFilter && s.country_code !== countryFilter) return false;
      if (severityFilter && s.severity !== severityFilter) return false;
      if (eventTypeFilter && s.event_type !== eventTypeFilter) return false;
      return true;
    });

    return {
      sorted: sortSituations(filtered),
      countries,
      severities,
      eventTypes,
    };
  }, [situations, countryFilter, severityFilter, eventTypeFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-brand-light-gray-violet bg-white p-4 animate-pulse"
          >
            <div className="h-6 w-1/3 bg-brand-pale-lavender rounded mb-3" />
            <div className="h-4 w-full bg-brand-light-gray-violet rounded mb-2" />
            <div className="h-4 w-2/3 bg-brand-light-gray-violet rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-lg border border-brand-light-gray-violet bg-white px-3 py-2 text-sm text-brand-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="">All countries</option>
          {countries.map((cc) => (
            <option key={cc} value={cc}>
              {cc}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-brand-light-gray-violet bg-white px-3 py-2 text-sm text-brand-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="">All severities</option>
          {severities.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="rounded-lg border border-brand-light-gray-violet bg-white px-3 py-2 text-sm text-brand-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="">All event types</option>
          {eventTypes.map((et) => (
            <option key={et} value={et}>
              {et.charAt(0).toUpperCase() + et.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-brand-light-gray-violet bg-white p-12 text-center">
          <p className="text-brand-charcoal-violet text-sm">
            {situations.length === 0
              ? "No active situations — all clear across monitored countries."
              : "No situations match the selected filters."}
          </p>
          <p className="text-brand-medium-gray-violet text-xs mt-1">
            Situations from roster countries will appear here when detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((situation) => (
            <SituationCard key={situation.id} situation={situation} />
          ))}
        </div>
      )}
    </div>
  );
}
