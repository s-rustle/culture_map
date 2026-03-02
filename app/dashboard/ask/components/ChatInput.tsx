"use client";

/**
 * Global Pulse — ChatInput (Phase 4.2)
 * Text input with send button. Disabled while agent is processing.
 * Typing indicator (animated dots) shown when loading.
 */

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  loading = false,
  placeholder = "Type your question…",
}: ChatInputProps) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={loading ? "Thinking…" : placeholder}
        className="flex-1 rounded-lg border border-brand-light-gray-violet bg-brand-light-bg px-4 py-2.5 text-sm text-brand-dark-bg placeholder:text-brand-medium-gray-violet focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-60 disabled:cursor-not-allowed disabled:placeholder:text-brand-medium-gray-violet"
        disabled={loading}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={loading || !value.trim()}
        className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-medium text-brand-text-on-accent hover:bg-brand-accent-hover disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 min-w-[80px] justify-center"
      >
        {loading ? (
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-text-on-accent/90 animate-[bounce_1.4s_ease-in-out_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-text-on-accent/90 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-text-on-accent/90 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
          </span>
        ) : (
          "Send"
        )}
      </button>
    </div>
  );
}
