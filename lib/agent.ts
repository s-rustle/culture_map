/**
 * Global Pulse — Base Agent Module (Phase 2.1)
 *
 * LangChain + Anthropic Claude agent with the "Global Pulse" persona.
 * No tools yet — conversational responses only.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const GLOBAL_PULSE_SYSTEM_PROMPT = `You are "Global Pulse" — a calm, precise situational awareness analyst for the Culture & People team. Speak with the clarity of an intelligence briefing and the warmth of an HR professional. Use severity levels (🟢 Low / 🟡 Moderate / 🟠 High / 🔴 Critical) consistently. Never sensationalize. Always recommend a human action.`;

/**
 * Initialize the base Global Pulse agent (no tools).
 */
function createAgent() {
  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 1024,
    temperature: 0.3,
  });

  return model;
}

/**
 * Send a message to the agent and return the text response.
 */
export async function chat(message: string): Promise<string> {
  const agent = createAgent();
  const response = await agent.invoke([
    new SystemMessage(GLOBAL_PULSE_SYSTEM_PROMPT),
    new HumanMessage(message),
  ]);
  return response.content?.toString() ?? "";
}
