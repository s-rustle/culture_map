/**
 * Global Pulse — Auth (Amendment 1)
 *
 * Email + shared password. Session stores coach_id, email, name, is_admin.
 * Coaches loaded from data/coaches.json until DB is connected.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { loadCoachesSync } from "./coaches-loader";
import type { SessionUser } from "./types";

const COOKIE_NAME = "global-pulse-session";
const SESSION_DURATION_SEC = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET env var required (min 32 chars)");
  }
  return new TextEncoder().encode(secret);
}

export interface AuthResult {
  success: boolean;
  user?: SessionUser;
  error?: string;
}

/**
 * Validate email + password and return session user.
 * Coaches are looked up by email in data/coaches.json.
 */
export function validateLogin(
  email: string,
  password: string
): AuthResult {
  const expectedPassword = process.env.AUTH_PASSWORD;
  if (!expectedPassword) {
    return { success: false, error: "Auth not configured" };
  }
  if (password !== expectedPassword) {
    return { success: false, error: "Invalid credentials" };
  }

  const { coaches, errors } = loadCoachesSync();
  if (errors.length > 0 && coaches.length === 0) {
    return { success: false, error: "Coaches data not loaded" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const idx = coaches.findIndex(
    (c) => c.email.trim().toLowerCase() === normalizedEmail
  );
  const coach = idx >= 0 ? coaches[idx] : undefined;

  if (!coach) {
    return { success: false, error: "Invalid credentials" };
  }

  return {
    success: true,
    user: {
      coach_id: idx + 1, // temporary id from array index until DB
      email: coach.email,
      name: coach.name,
      is_admin: coach.is_admin,
    },
  };
}

/**
 * Create signed JWT session and set cookie.
 */
export async function createSession(user: SessionUser): Promise<string> {
  const secret = getSecret();
  const token = await new SignJWT({
    coach_id: user.coach_id,
    email: user.email,
    name: user.name,
    is_admin: user.is_admin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION_SEC)
    .sign(secret);

  return token;
}

/**
 * Verify session token and return user.
 */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      coach_id: payload.coach_id as number,
      email: payload.email as string,
      name: payload.name as string,
      is_admin: payload.is_admin as boolean,
    };
  } catch {
    return null;
  }
}

/**
 * Get current session user from cookie (use in Server Components / API routes).
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export { COOKIE_NAME };
