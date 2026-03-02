"use client";

/**
 * Global Pulse — ChatWindow (Phase 4.1)
 * Scrollable message thread. User right-aligned. Agent left-aligned with purple left border.
 * Auto-scroll to bottom on new messages.
 */

import { useEffect, useRef } from "react";
import { AgentResponse } from "./AgentResponse";

export type ChatEntry = { role: "user" | "assistant"; content: string };

interface ChatWindowProps {
  history: ChatEntry[];
  loading?: boolean;
  emptyMessage?: string;
}

export function ChatWindow({
  history,
  loading,
  emptyMessage = "Ask anything, e.g. \"Check on our team in Brazil\"",
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, loading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto rounded-lg border border-brand-light-gray-violet bg-brand-light-bg p-3 sm:p-4 mb-4 min-h-[180px] sm:min-h-[200px] flex flex-col"
    >
      {history.length === 0 && !loading && (
        <div className="text-brand-charcoal-violet text-sm py-6 space-y-2">
          <p className="font-medium text-brand-dark-bg">What can I help with?</p>
          <p className="whitespace-pre-wrap">{emptyMessage}</p>
        </div>
      )}
      <div className="space-y-4">
        {history.map((h, i) => (
          <div
            key={i}
            className={`flex ${h.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] ${h.role === "user" ? "flex flex-col items-end" : ""}`}
            >
              <span
                className={`text-xs font-medium text-brand-charcoal-violet block mb-1 ${
                  h.role === "user" ? "text-right" : "text-left"
                }`}
              >
                {h.role === "user" ? "You" : "Agent"}
              </span>
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  h.role === "user"
                    ? "bg-brand-accent text-brand-text-on-accent w-fit max-w-full"
                    : "bg-brand-pale-lavender text-brand-dark-bg border-l-4 border-brand-accent"
                }`}
              >
                {h.role === "user" ? (
                  <p className="whitespace-pre-wrap">{h.content}</p>
                ) : (
                  <AgentResponse content={h.content} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <div className="flex justify-start pt-2">
          <div className="flex items-center gap-1.5 text-brand-charcoal-violet text-sm">
            <span>Thinking</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-[bounce_1.4s_ease-in-out_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
