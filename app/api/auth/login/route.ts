/**
 * Global Pulse — Login API (Amendment 1)
 *
 * POST body: { email, password }
 * Validates against coaches.json + AUTH_PASSWORD. Sets session cookie.
 */

import { NextResponse } from "next/server";
import { validateLogin, createSession, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const result = validateLogin(email, password);
    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error ?? "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createSession(result.user);
    const response = NextResponse.json(
      { success: true, user: { name: result.user.name, is_admin: result.user.is_admin } }
    );

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
