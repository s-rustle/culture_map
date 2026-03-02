/**
 * Global Pulse — Agent Chat API (Phase 2.1)
 *
 * POST body: { message }
 * Returns the agent's conversational response. No tools yet.
 */

import { NextResponse } from "next/server";
import { chat } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message : "";

    if (!message.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const response = await chat(message);
    return NextResponse.json({ response });
  } catch (err) {
    console.error("Agent chat error:", err);
    return NextResponse.json(
      { error: "Unable to check this region right now" },
      { status: 500 }
    );
  }
}
