"use client";

/**
 * Global Pulse — Ask page (Phase 4.4)
 *
 * Chat interface with ChatWindow + ChatInput. Connects to /api/agent/chat.
 * conversation_id enables server-side memory. "New conversation" resets thread.
 */

import { useState, useCallback } from "react";
import { ChatWindow, type ChatEntry } from "./components/ChatWindow";
import { ChatInput } from "./components/ChatInput";

function generateConversationId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function AskPage() {
  const [conversationId, setConversationId] = useState(generateConversationId);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startNewConversation = useCallback(() => {
    setConversationId(generateConversationId());
    setHistory([]);
    setInput("");
    setError(null);
  }, []);

  const sendMessage = useCallback(async () => {
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setLoading(true);
    setError(null);

    setHistory((prev) => [...prev, { role: "user", content: message }]);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Unable to check this region right now");
      }

      const reply = typeof data.response === "string" ? data.response : "";
      setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to check this region right now";
      setError(msg);
      setHistory((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId]);

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full max-h-[calc(100vh-0px)] min-h-0">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-brand-dark-bg">Ask</h2>
        <button
          type="button"
          onClick={startNewConversation}
          className="text-sm font-medium text-brand-accent border border-brand-accent rounded-lg px-3 py-1.5 hover:bg-brand-accent hover:text-brand-text-on-accent transition-colors"
        >
          New conversation
        </button>
      </div>
      <p className="text-brand-charcoal-violet mb-4 text-sm">
        Chat with the agent. Ask about situations in your countries — roster,
        weather, news. No emails are drafted here.
      </p>

      <ChatWindow
        history={history}
        loading={loading}
        emptyMessage="Ask about situations in your countries. Example queries: Check on our team in Brazil. What's happening in South Africa? Any weather alerts in Colombia?"
      />

      {error && (
        <p className="text-brand-violet text-sm mb-2 font-medium" role="alert">
          {error}
        </p>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        loading={loading}
      />
    </div>
  );
}
