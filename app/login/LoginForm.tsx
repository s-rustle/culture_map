"use client";

/**
 * Login form — client component with useSearchParams.
 * Wrapped in Suspense by parent page.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light-bg">
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-white border border-brand-light-gray-violet">
        <h1 className="text-2xl font-semibold text-brand-dark-bg mb-2">
          Global Pulse
        </h1>
        <p className="text-brand-medium-gray-violet text-sm mb-6">
          Situational awareness for remote teams
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-brand-charcoal-violet mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2 rounded border border-brand-light-gray-violet bg-white text-brand-dark-bg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              placeholder="you@lumenalta.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-brand-charcoal-violet mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 rounded border border-brand-light-gray-violet bg-white text-brand-dark-bg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-brand-violet bg-brand-pale-lavender px-3 py-2 rounded font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded font-medium text-white bg-brand-accent hover:bg-brand-accent/90 focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-brand-medium-gray-violet text-center mt-2">
            No env configured? Use password <code className="bg-brand-pale-lavender px-1 rounded">demo</code>
          </p>
        </form>
      </div>
    </div>
  );
}
