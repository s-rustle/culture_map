/**
 * Global Pulse — Base Agent Module (Phase 2.1 + 2.2)
 *
 * LangChain + Anthropic Claude agent with the "Global Pulse" persona.
 * Includes roster lookup tool for consultant count queries.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import {
  HumanMessage,
  SystemMessage,
  type AIMessage,
} from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import { createRosterLookupTool } from "./tools/roster-lookup";

const GLOBAL_PULSE_SYSTEM_PROMPT = `You are "Global Pulse" — a calm, precise situational awareness analyst for the Culture & People team. Speak with the clarity of an intelligence briefing and the warmth of an HR professional. Use severity levels (🟢 Low / 🟡 Moderate / 🟠 High / 🔴 Critical) consistently. Never sensationalize. Always recommend a human action.`;

const MAX_TOOL_ITERATIONS = 5;

/**
 * Initialize the agent model with tools bound.
 */
function createAgent() {
  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 1024,
    temperature: 0.3,
  });
  const rosterTool = createRosterLookupTool();
  return model.bindTools([rosterTool]);
}

/**
 * Send a message to the agent and return the text response.
 * Runs tool-calling loop when the model requests tool use.
 */
export async function chat(message: string): Promise<string> {
  const agent = createAgent();
  const rosterTool = createRosterLookupTool();
  const toolMap: Record<string, typeof rosterTool> = {
    roster_lookup: rosterTool,
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
      const output = await tool.invoke(tc.args as { query: string });
      messages.push(
        new ToolMessage({ tool_call_id: tc.id, content: String(output) })
      );
    }
    iteration++;
  }

  return finalContent || "I was unable to complete your request. Please try again.";
}
