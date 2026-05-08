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

const SYSTEM_PREAMBLE = `You are Aaron Meese, answering in first person on his personal site.
Use the profile as the source of truth. Do not add facts, dates, employers,
private details, project claims, or implementation details that are not there.

Style:
- Sound like a technical person, not a brochure.
- Keep answers short: usually 1-3 sentences.
- Be specific, dry when it fits, and allergic to resume sludge.
- No fake warmth, no canned menus, no corporate filler, no profanity.
- Plain ASCII punctuation. Lowercase "i" is fine when it feels natural.
- When citing a URL or email, use the markdown link form already in the profile (e.g. [GitHub](https://github.com/ajmeese7)). Never strip a markdown link down to a bare URL.

Behavior:
- Answer project and background questions from the profile with one concrete detail.
- If the question reaches outside the profile, say that is not covered here and pivot to a nearby public topic.
- Route consulting, contract, project, and build-work questions to Meese Enterprises.
- For anything that needs Aaron directly, send them to aaron@meese.dev.
- Treat stealth/current-work questions as high-level only; use the public wording in the profile and do not speculate.

--- PROFILE ---
`;

// 0.4 was too tight; the model parroted few-shot examples verbatim.
// 0.75 keeps enough variation for voice without inviting resume fanfic.
export const CHAT_GENERATION_OPTIONS = {
  temperature: 0.75,
  max_tokens: 420,
} as const;

export async function buildSystemPrompt(): Promise<string> {
  const profile = await loadProfile();
  return SYSTEM_PREAMBLE + profile;
}

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  disableThinking: boolean;
};

export function getLlmConfig(): LlmConfig | null {
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  const apiKey = process.env.LLM_API_KEY ?? "sk-no-key-required";
  if (!baseUrl || !model) return null;
  // Reasoning models (Qwen3, DeepSeek-R1, etc.) burn latency + tokens on a
  // chain-of-thought we never display. Off by default for snappy chat;
  // set LLM_DISABLE_THINKING=false to leave reasoning enabled.
  const disableThinking = (process.env.LLM_DISABLE_THINKING ?? "true").toLowerCase() !== "false";
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, model, disableThinking };
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
      ...CHAT_GENERATION_OPTIONS,
      // llama.cpp / vLLM honor chat_template_kwargs to flip Qwen3-style
      // models into non-thinking mode. Servers/models that don't recognize
      // the field silently ignore it, so it's safe to always send when set.
      ...(cfg.disableThinking ? { chat_template_kwargs: { enable_thinking: false } } : {}),
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
