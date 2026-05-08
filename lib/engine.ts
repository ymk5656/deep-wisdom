import Groq from "groq-sdk";
import { buildSystemPrompt } from "./prompts";
import { ConversationState } from "./state-machine";
import { checkCrisis, detectContradiction, isAmbiguous, CRISIS_RESPONSE } from "./guard";
import { saveMessage, updateSessionState } from "./db";

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const FALLBACK = process.env.GROQ_FALLBACK_MODEL ?? "llama-3.1-8b-instant";

const MODULE_HINTS: Record<string, string> = {
  clarification: "\n\n상대가 모호한 표현을 사용했습니다. 추측하여 자연스럽게 반응하되, 굳이 확인 질문은 하지 마세요.",
  confrontation: "\n\n상대의 말에 모순이 보입니다. 부드럽게 지적하고 이와 관련된 조언을 함께 제공해 주세요.",
  interpretation: "\n\n반복되는 패턴이나 주제가 보이면 이를 반영하고, 개선에 도움이 될 조언을 제시해 주세요.",
};

export class CounselingEngine {
  private client: Groq;
  public convState: ConversationState;
  private history: { role: string; content: string }[];
  private sessionId: string;

  constructor(sessionId: string, convState: ConversationState, history: { role: string; content: string }[] = []) {
    this.sessionId = sessionId;
    this.convState = convState;
    this.history = history;
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async *chatStream(userInput: string): AsyncGenerator<string> {
    if (checkCrisis(userInput)) {
      this.convState.triggerCrisis();
      updateSessionState(this.sessionId, "CRISIS", "high");
      saveMessage(this.sessionId, "user", userInput);
      saveMessage(this.sessionId, "assistant", CRISIS_RESPONSE, "crisis");
      yield CRISIS_RESPONSE;
      return;
    }

    const hasContradiction = detectContradiction(this.history);
    const ambiguous = isAmbiguous(userInput);
    const moduleName = this.convState.activeModule(hasContradiction, ambiguous);

    let systemPrompt = buildSystemPrompt(this.convState.state);
    if (MODULE_HINTS[moduleName]) systemPrompt += MODULE_HINTS[moduleName];

    this.history.push({ role: "user", content: userInput });
    saveMessage(this.sessionId, "user", userInput);

    const messages = [{ role: "system" as const, content: systemPrompt }, ...this.history] as Parameters<typeof this.client.chat.completions.create>[0]["messages"];

    let fullResponse = "";

    for (const model of [MODEL, FALLBACK]) {
      try {
        const stream = await this.client.chat.completions.create({
          model,
          messages,
          max_tokens: 512,
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            yield delta;
          }
        }
        break;
      } catch (e: unknown) {
        const msg = String(e);
        if ((msg.includes("rate_limit") || msg.includes("429")) && model === MODEL) {
          yield "\x00SYS:모델 전환 중...";
          continue;
        }
        throw e;
      }
    }

    this.history.push({ role: "assistant", content: fullResponse });
    saveMessage(this.sessionId, "assistant", fullResponse, moduleName);

    this.convState.advance(userInput);
    updateSessionState(this.sessionId, this.convState.state, this.convState.riskLevel);
  }
}
