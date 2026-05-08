import { NextRequest } from "next/server";
import { CounselingEngine } from "@/lib/engine";
import { ConversationState, type CounselingState } from "@/lib/state-machine";
import { getSession, getSessionMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId, message } = await req.json();

  if (!sessionId || !message) {
    return new Response("sessionId and message required", { status: 400 });
  }

  const sess = await getSession(sessionId);
  if (!sess) return new Response("Session not found", { status: 404 });

  const history = await getSessionMessages(sessionId);
  const convState = new ConversationState(
    sess.state as CounselingState,
    sess.risk_level as "low" | "medium" | "high",
  );
  convState.turnCount = Math.max(0, Math.floor(history.filter(m => m.role === "user").length));

  const engine = new CounselingEngine(sessionId, convState, history);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of engine.chatStream(message)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
