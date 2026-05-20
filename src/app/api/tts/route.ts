export const runtime = "nodejs";

export async function POST(req: Request) {
  let text: string;
  try {
    const body = await req.json();
    text = String(body?.text ?? "").trim();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (!text) return new Response("text required", { status: 400 });

  const apiKey = process.env.TTS_API_KEY;
  const voice = process.env.TTS_VOICE ?? "echo";

  if (!apiKey) {
    return new Response("tts not configured", { status: 503 });
  }

  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "tts-1", input: text, voice }),
  });

  if (!upstream.ok) {
    const msg = await upstream.text();
    return new Response(`tts upstream error: ${msg}`, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
