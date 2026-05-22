import { NextResponse } from "next/server";
import { buildSystemPrompt, type ChatMessage, getLlmConfig, streamChat } from "@/lib/llm";

// Node runtime so we can read profile.md from disk. Switch to edge later
// only if the profile is inlined as a string constant.
export const runtime = "nodejs";

const PLACEHOLDER_REPLY = [
  "the clone is offline. chat endpoint is wired up, no model behind it.",
  "self-hosting? drop LLM_API_KEY into .env.local and i'm back. deepseek is the zero-config default; point LLM_BASE_URL + LLM_MODEL elsewhere for any other openai-compatible backend (ollama, lm studio, openrouter, groq, vllm).",
].join("\n\n");

function streamPlaceholder(): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      for (const ch of PLACEHOLDER_REPLY) {
        controller.enqueue(encoder.encode(ch));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: textHeaders });
}

const textHeaders = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "no-store",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const messages = (body as { messages?: ChatMessage[] })?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const cfg = getLlmConfig();
  if (!cfg) return streamPlaceholder();

  const trimmed = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
  const system = await buildSystemPrompt();
  const upstream: ChatMessage[] = [{ role: "system", content: system }, ...trimmed];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const delta of streamChat(cfg, upstream)) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        controller.enqueue(encoder.encode(`\n\n[upstream error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: textHeaders });
}
