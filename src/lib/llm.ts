// Provider-agnostic OpenAI-compatible chat client.
// Works with OpenAI, Ollama (http://localhost:11434/v1), LM Studio
// (http://localhost:1234/v1), vLLM, llama.cpp server, OpenRouter, Together,
// Groq, etc. Set LLM_BASE_URL, LLM_API_KEY (any non-empty string for local
// servers that don't auth), and LLM_MODEL.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

let cachedProfile: string | null = null;
async function loadProfile(): Promise<string> {
  if (cachedProfile) return cachedProfile;
  const path = join(process.cwd(), "src", "content", "profile.md");
  cachedProfile = await readFile(path, "utf8");
  return cachedProfile;
}

const SYSTEM_PREAMBLE = `You are the AI host of Aaron Meese's personal site. Answer ONLY using the
profile below. If asked anything not covered, say briefly that you only
discuss Aaron's work and background, then suggest one of: "Tell me about
your projects", "What are you working on?", "How do I hire you?". Keep
replies short, direct, and lowercase-friendly to match the site's tone.
Never invent jobs, employers, or facts. The startup he's at stays
"stealth"; do not name it.

--- PROFILE ---
`;

export async function buildSystemPrompt(): Promise<string> {
  const profile = await loadProfile();
  return SYSTEM_PREAMBLE + profile;
}

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function getLlmConfig(): LlmConfig | null {
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  const apiKey = process.env.LLM_API_KEY ?? "sk-no-key-required";
  if (!baseUrl || !model) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, model };
}

// Streams the upstream OpenAI-compatible /chat/completions response and
// yields plain text deltas (no SSE framing) so the client can append directly.
export async function* streamChat(
  cfg: LlmConfig,
  messages: ChatMessage[],
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`upstream ${res.status}: ${detail.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const nl = buffer.indexOf("\n");
      if (nl === -1) break;
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
