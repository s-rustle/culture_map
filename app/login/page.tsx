/**
 * Global Pulse — Login page (Amendment 1)
 *
 * Email + shared password. Brand styling per spec.
 * Force dynamic to avoid prerender errors with useSearchParams.
 */

import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-light-bg">
          <div className="text-brand-medium-gray-violet">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
