/**
 * Global Pulse — Home
 *
 * Redirects to dashboard if logged in, otherwise to login.
 */

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const user = await getSession();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-light-bg">
      <h1 className="text-2xl font-semibold text-brand-dark-bg mb-2">
        Global Pulse
      </h1>
      <p className="text-brand-medium-gray-violet mb-6">
        Situational awareness for remote teams
      </p>
      <Link
        href="/login"
        className="px-6 py-2.5 rounded font-medium text-white bg-brand-accent hover:bg-brand-accent/90"
      >
        Sign in
      </Link>
    </div>
  );
}
