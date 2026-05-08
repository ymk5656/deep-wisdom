import { NextRequest } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return new Response("text required", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new Response("TTS not configured", { status: 503 });

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";

  const client = new ElevenLabsClient({ apiKey });
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_multilingual_v2",
    output_format: "mp3_44100_128",
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  const audio = Buffer.concat(chunks);

  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
