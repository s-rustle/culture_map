/**
 * Global Pulse — Base Agent Module (Phase 2.1–2.4)
 *
 * LangChain + Anthropic Claude agent with the "Global Pulse" persona.
 * Interactive tools: roster, weather, news, web search. email_drafter is backend-only (Phase 6 cron).
 */

import { ChatAnthropic, tools } from "@langchain/anthropic";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { createRosterLookupTool } from "./tools/roster-lookup";
import { createWeatherMonitorTool } from "./tools/weather-monitor";
import { createNewsScannerTool } from "./tools/news-scanner";

const GLOBAL_PULSE_SYSTEM_PROMPT = `You are "Global Pulse" — a calm, precise situational awareness analyst for the Culture & People team. Speak with the clarity of an intelligence briefing and the warmth of an HR professional. Use severity levels (🟢 Low / 🟡 Moderate / 🟠 High / 🔴 Critical) consistently. Never sensationalize. Always recommend a human action.

When asked to "check on" a country or region, always run a full situational assessment: roster lookup, weather check, and news scan. Synthesize all results into a single briefing. For follow-ups like "What about Argentina?" or "And France?", treat them as the same type of request and run the full assessment for the newly mentioned country.`;

const MAX_TOOL_ITERATIONS = 5;

/**
 * Initialize the agent model with tools bound.
 * Web search runs server-side via Anthropic API (no toolMap entry needed).
 */
function createAgent() {
  const model = new ChatAnthropic({
    model: "claude-sonnet-4-5-20250929", // Sonnet 4.5 required for web search
    maxTokens: 1024,
    temperature: 0.3,
  });
  const rosterTool = createRosterLookupTool();
  const weatherTool = createWeatherMonitorTool();
  const newsScannerTool = createNewsScannerTool();
  const webSearchTool = tools.webSearch_20250305({
    maxUses: 5,
  });
  // Note: allowedDomains omitted — major news sites (reuters, bbc, nyt, etc.)
  // block Anthropic's crawler. news_scanner (NewsAPI) covers news for situational awareness.
  return model.bindTools([rosterTool, weatherTool, newsScannerTool, webSearchTool]);
}

/** History entry for conversation memory (Task 2.7) */
export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a message to the agent and return the text response.
 * Runs tool-calling loop when the model requests tool use.
 * @param message - The new user message
 * @param history - Optional prior conversation for within-session continuity
 */
export async function chat(
  message: string,
  history: ChatHistoryEntry[] = []
): Promise<string> {
  const agent = createAgent();
  const rosterTool = createRosterLookupTool();
  const weatherTool = createWeatherMonitorTool();
  const newsScannerTool = createNewsScannerTool();
  const toolMap: Record<string, StructuredToolInterface> = {
    roster_lookup: rosterTool,
    weather_monitor: weatherTool,
    news_scanner: newsScannerTool,
  };

  const historyMsgs: (HumanMessage | AIMessage)[] = history.map((h) =>
    h.role === "user" ? new HumanMessage(h.content) : new AIMessage(h.content)
  );

  let messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
    new SystemMessage(GLOBAL_PULSE_SYSTEM_PROMPT),
    ...historyMsgs,
    new HumanMessage(message),
  ];

  let iteration = 0;
  let finalContent = "";

  while (iteration < MAX_TOOL_ITERATIONS) {
    const response = (await agent.invoke(messages)) as AIMessage;
    messages.push(response);

    const toolCalls = response.tool_calls ?? [];
    if (toolCalls.length === 0) {
      finalContent = response.content?.toString() ?? "";
      break;
    }

    for (const tc of toolCalls) {
      const tool = tc.name ? toolMap[tc.name] : undefined;
      if (!tool || !tc.id) continue;
      const output = await tool.invoke(tc.args as Record<string, unknown>);
      messages.push(
        new ToolMessage({ tool_call_id: tc.id, content: String(output) })
      );
    }
    iteration++;
  }

  return finalContent || "I was unable to complete your request. Please try again.";
}
