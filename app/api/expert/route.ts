import { NextRequest } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const EXPERT_PROMPT = `당신은 임상심리 및 상담 분야의 전문 연구 보조자입니다.
아래 주제에 대해 상담사가 실제 현장에서 활용할 수 있도록 근거 기반 전문 정보를 제공하세요.

다음 형식으로 한국어로 작성하세요:

## 핵심 전문가 의견
- (3~5가지 bullet point)

## 근거 기반 접근법
어떤 치료/상담 기법이 권장되는지 (CBT, DBT, ACT 등)

## 참고문헌
관련 학술 논문 및 임상 가이드라인을 간략히 소개 (저자, 연도, 제목)

## 주의사항
간략한 주의사항 (1~2줄)

전문 용어는 한국어(영어 병기) 형식으로 작성하세요.

주제: {query}`;

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) return new Response("query required", { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const fallback = process.env.GROQ_FALLBACK_MODEL ?? "llama-3.1-8b-instant";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const modelId of [model, fallback]) {
        try {
          const groqStream = await client.chat.completions.create({
            model: modelId,
            messages: [{ role: "user", content: EXPERT_PROMPT.replace("{query}", query) }],
            max_tokens: 1024,
            temperature: 0.3,
            stream: true,
          });
          for await (const chunk of groqStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify(delta)}\n\n`));
          }
          break;
        } catch (e) {
          const msg = String(e);
          if ((msg.includes("rate_limit") || msg.includes("429")) && modelId === model) continue;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify("오류가 발생했습니다.")}\n\n`));
          break;
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
