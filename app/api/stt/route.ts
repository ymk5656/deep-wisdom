import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { toFile } from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  if (!audio) return new Response("audio required", { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const arrayBuffer = await audio.arrayBuffer();
  const file = await toFile(Buffer.from(arrayBuffer), "audio.webm", { type: audio.type });

  const result = await client.audio.transcriptions.create({
    model: "whisper-large-v3",
    file,
    language: "ko",
  });

  return Response.json({ text: result.text });
}
