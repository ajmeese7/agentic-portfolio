"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

// Pool of conversation starters. All should be answerable from
// src/content/profile.md so the model doesn't refuse. Three are picked at
// random on each page load. Keep prompts short and uniform so the chip row
// reads as one tidy line instead of a ragged wrap.
const PROMPT_POOL = [
  "Tell me about your projects",
  "What are you building?",
  "Pitch me on readme-ascii",
  "Where can I find your work?",
  "How was the avatar built?",
  "What is termblog?",
  "What problems excite you?",
  "What does Meese Enterprises do?",
  "What's your local LLM work?",
];
const VISIBLE_PROMPTS = 3;

function pickPrompts(): string[] {
  const copy = PROMPT_POOL.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, VISIBLE_PROMPTS);
}

// Inline markdown links only: `[label](https://… | mailto:…)`. Anything else
// streams through as plain text. Partial matches mid-stream stay as raw text
// until the closing paren arrives, then snap to an anchor on the next tick.
const MD_LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(MD_LINK_RE)) {
    const start = match.index ?? 0;
    if (start > cursor) out.push(text.slice(cursor, start));
    const [, label, href] = match;
    out.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-accent underline underline-offset-2 hover:no-underline"
      >
        {label}
      </a>,
    );
    cursor = start + match[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

interface ChatProps {
  onResponseComplete?: (text: string) => void;
}

export function Chat({ onResponseComplete }: ChatProps = {}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  // Render a stable subset on the server so SSR + first hydration match;
  // the effect below shuffles client-side after mount.
  const [prompts, setPrompts] = useState<string[]>(PROMPT_POOL.slice(0, VISIBLE_PROMPTS));
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrompts(pickPrompts());
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      setStreaming(true);
      const next: Msg[] = [...messages, { role: "user", content: text }];
      setMessages([...next, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        if (!res.body) throw new Error("no stream");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((cur) => {
            const copy = cur.slice();
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        }
        if (acc.trim()) onResponseComplete?.(acc);
      } catch {
        setMessages((cur) => {
          const copy = cur.slice();
          copy[copy.length - 1] = {
            role: "assistant",
            content: "[chat backend unreachable — check LLM_BASE_URL]",
          };
          return copy;
        });
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, onResponseComplete],
  );

  // Stick to the bottom on every token so the streaming reply stays in view.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const hasMessages = messages.length > 0;
  const canSend = !streaming && input.trim().length > 0;

  return (
    <section aria-label="chat" className="mt-10 space-y-3">
      {!hasMessages && (
        <div className="border border-border-default rounded divide-y divide-border-default overflow-hidden">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              className="w-full text-left px-3 py-3 text-sm text-foreground hover:text-accent hover:bg-foreground/5 transition-colors"
            >
              ↳ {p}
            </button>
          ))}
        </div>
      )}

      {hasMessages && (
        <div
          ref={scrollerRef}
          className="max-h-96 overflow-y-auto space-y-4 text-sm pr-1"
        >
          {messages.map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
            <div key={i} className="leading-relaxed whitespace-pre-wrap">
              <span className={m.role === "user" ? "text-muted" : "text-accent"}>
                {m.role === "user" ? "you ›" : "aaron ›"}
              </span>{" "}
              <span
                className={
                  streaming && i === messages.length - 1 && m.role === "assistant"
                    ? "cursor-blink"
                    : ""
                }
              >
                {m.role === "assistant" ? renderInline(m.content) : m.content}
              </span>
            </div>
          ))}
        </div>
      )}

      <form
        className="flex items-stretch border border-border-default rounded focus-within:border-accent transition-colors"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input;
          setInput("");
          send(text);
        }}
      >
        <span className="pl-3 pr-1 py-3 text-accent select-none">›</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          placeholder={hasMessages ? "reply…" : "ask about Aaron"}
          className="flex-1 bg-transparent py-3 pr-3 text-sm outline-none placeholder:text-muted disabled:opacity-60"
          maxLength={500}
          aria-label="chat input"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="send"
          className="px-4 text-muted hover:text-accent transition-colors disabled:opacity-30 disabled:hover:text-muted border-l border-border-default"
        >
          ↵
        </button>
      </form>
    </section>
  );
}
