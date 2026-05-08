const EMOTION_KEYWORDS = [
  "슬프", "화", "무기력", "불안", "외로", "두렵", "지쳤", "힘들",
  "억울", "후회", "실망", "막막", "무서", "걱정", "속상", "답답",
];

export type CounselingState =
  | "INIT" | "RAPPORT" | "EXPLORATION" | "DEEPENING"
  | "INSIGHT" | "CLOSING" | "CRISIS";

export class ConversationState {
  state: CounselingState;
  turnCount: number;
  emotionDensity: number;
  riskLevel: "low" | "medium" | "high";

  constructor(state: CounselingState = "INIT", riskLevel: "low" | "medium" | "high" = "low") {
    this.state = state;
    this.turnCount = 0;
    this.emotionDensity = 0;
    this.riskLevel = riskLevel;
  }

  advance(userInput: string): void {
    if (this.state === "CRISIS") return;

    this.turnCount++;
    this.emotionDensity += EMOTION_KEYWORDS.filter(kw => userInput.includes(kw)).length;

    if (this.state === "INIT") this.state = "RAPPORT";
    else if (this.state === "RAPPORT" && this.turnCount >= 3) this.state = "EXPLORATION";
    else if (this.state === "EXPLORATION" && this.turnCount >= 6) this.state = "DEEPENING";
    else if (this.state === "DEEPENING" && this.turnCount >= 10) this.state = "INSIGHT";
    else if (this.state === "INSIGHT" && this.turnCount >= 14) this.state = "CLOSING";
  }

  triggerCrisis(): void {
    this.state = "CRISIS";
    this.riskLevel = "high";
  }

  private shouldUseConfrontation(hasContradiction: boolean): boolean {
    return hasContradiction && ["DEEPENING", "INSIGHT"].includes(this.state) && this.turnCount >= 6;
  }

  private shouldUseInterpretation(): boolean {
    return this.state === "INSIGHT" && this.turnCount >= 8;
  }

  activeModule(hasContradiction = false, isAmbiguous = false): string {
    if (this.state === "CRISIS") return "crisis";
    if (this.shouldUseInterpretation()) return "interpretation";
    if (this.shouldUseConfrontation(hasContradiction)) return "confrontation";
    if (isAmbiguous && ["RAPPORT", "EXPLORATION"].includes(this.state)) return "clarification";
    if (["INIT", "RAPPORT", "CLOSING"].includes(this.state)) return "rapport";
    return "exploration";
  }
}
