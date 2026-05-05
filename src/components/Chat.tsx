"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const PROMPTS = ["Tell me about your projects", "What are you working on?", "How do I hire you?"];

export function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      setOpen(true);
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
    [messages, streaming],
  );

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section aria-label="conversation mode" className="mt-10">
      <div className="flex flex-wrap gap-3">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => send(p)}
            className="border border-border-default rounded px-3 py-2 text-sm text-foreground hover:border-accent hover:text-accent transition-colors"
          >
            ↳ {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-xs text-muted hover:text-accent transition-colors self-center"
          aria-expanded={open}
        >
          {open ? "[hide conversation]" : "[conversation mode]"}
        </button>
      </div>

      {open && (
        <div className="mt-6 border border-border-default rounded">
          <div ref={scrollerRef} className="max-h-96 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.length === 0 && (
              <p className="text-muted">
                ask anything about Aaron's work, projects, or background.
              </p>
            )}
            {messages.map((m, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
              <div key={i} className="leading-relaxed">
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
                  {m.content}
                </span>
              </div>
            ))}
          </div>
          <form
            className="flex border-t border-border-default"
            onSubmit={(e) => {
              e.preventDefault();
              const text = input;
              setInput("");
              send(text);
            }}
          >
            <span className="px-3 py-2 text-accent select-none">›</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              placeholder="type a question…"
              className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none placeholder:text-muted"
              maxLength={500}
            />
          </form>
        </div>
      )}
    </section>
  );
}
