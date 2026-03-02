"use client";

/**
 * Global Pulse — Dashboard client (Phase 3.5)
 * Fetches stats + situations, auto-refreshes every 5 minutes.
 */

import { useEffect, useState, useCallback } from "react";
import { StatsBar, type DashboardStats } from "./components/StatsBar";
import { SituationList } from "./components/SituationList";
import type { Situation } from "@/lib/types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats", { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error ?? "Failed to load stats";
    throw new Error(res.status === 401 ? `${msg} — try signing in again.` : msg);
  }
  return data;
}

async function fetchSituations(): Promise<Situation[]> {
  const res = await fetch("/api/situations/active", { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error ?? "Failed to load situations";
    throw new Error(res.status === 401 ? `${msg} — try signing in again.` : msg);
  }
  return data.situations ?? [];
}

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsData, situationsData] = await Promise.all([
        fetchStats(),
        fetchSituations(),
      ]);
      setStats(statsData);
      setSituations(situationsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function loadRealData() {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/seed", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to seed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold text-brand-dark-bg mb-2">Dashboard</h2>
      <p className="text-brand-charcoal-violet text-sm mb-6">
        Situational awareness across monitored countries. Map view coming soon.
      </p>

      {error && (
        <div className="rounded-lg border border-brand-light-gray-violet bg-brand-pale-lavender text-brand-violet px-4 py-3 mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      <StatsBar stats={stats ?? { countries_monitored: 0, active_situations: 0, consultants_affected: 0, last_scan_at: null }} loading={loading} />

      <h3 className="text-lg font-medium text-brand-dark-bg mb-3">Active situations</h3>
      {stats?.is_admin && situations.length === 0 && !loading && (
        <div className="mb-4 rounded-lg border border-brand-light-gray-violet bg-brand-pale-lavender p-4">
          <p className="text-sm text-brand-charcoal-violet mb-2">No data yet. Load situations from your known-events.json + roster.</p>
          <button
            type="button"
            onClick={loadRealData}
            disabled={seeding}
            className="px-4 py-2 rounded font-medium text-white bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50"
          >
            {seeding ? "Loading…" : "Load real data"}
          </button>
        </div>
      )}
      <SituationList situations={situations} loading={loading} />
    </div>
  );
}
