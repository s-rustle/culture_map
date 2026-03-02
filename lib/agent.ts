/**
 * Global Pulse — Base Agent Module (Phase 2.1 + 2.2 + 2.3)
 *
 * LangChain + Anthropic Claude agent with the "Global Pulse" persona.
 * Includes roster lookup, weather monitor, and web search (news) tools.
 */

import { ChatAnthropic, tools } from "@langchain/anthropic";
import {
  HumanMessage,
  SystemMessage,
  type AIMessage,
} from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { createRosterLookupTool } from "./tools/roster-lookup";
import { createWeatherMonitorTool } from "./tools/weather-monitor";

const GLOBAL_PULSE_SYSTEM_PROMPT = `You are "Global Pulse" — a calm, precise situational awareness analyst for the Culture & People team. Speak with the clarity of an intelligence briefing and the warmth of an HR professional. Use severity levels (🟢 Low / 🟡 Moderate / 🟠 High / 🔴 Critical) consistently. Never sensationalize. Always recommend a human action.`;

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
  const webSearchTool = tools.webSearch_20250305({
    maxUses: 5,
    allowedDomains: [
      "reuters.com",
      "apnews.com",
      "bbc.com",
      "bbc.co.uk",
      "theguardian.com",
      "aljazeera.com",
      "france24.com",
      "nytimes.com",
      "washingtonpost.com",
    ],
  });
  return model.bindTools([rosterTool, weatherTool, webSearchTool]);
}

/**
 * Send a message to the agent and return the text response.
 * Runs tool-calling loop when the model requests tool use.
 */
export async function chat(message: string): Promise<string> {
  const agent = createAgent();
  const rosterTool = createRosterLookupTool();
  const weatherTool = createWeatherMonitorTool();
  const toolMap: Record<string, StructuredToolInterface> = {
    roster_lookup: rosterTool,
    weather_monitor: weatherTool,
  };

  let messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
    new SystemMessage(GLOBAL_PULSE_SYSTEM_PROMPT),
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
