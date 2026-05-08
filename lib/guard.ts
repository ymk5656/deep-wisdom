const CRISIS_KEYWORDS = [
  "죽고 싶", "사라지고 싶", "없어지고 싶", "죽이고 싶",
  "자해", "스스로 목숨", "자살", "목숨을 끊", "삶을 끝",
];

const AMBIGUOUS_PATTERNS = [
  "좀 힘들", "그냥 힘들", "힘든 것 같", "모르겠어", "그냥요", "별로", "그냥 그래",
];

const CONTRADICTION_PAIRS: [string, string][] = [
  ["괜찮", "힘들"], ["괜찮", "힘드"], ["괜찮", "슬프"],
  ["별로 안", "사실"], ["아무렇지", "힘들"],
];

export const CRISIS_RESPONSE = `지금 많이 힘드시겠어요. 그 고통이 얼마나 크신지 느껴집니다.

지금 이 순간, 혼자가 아니에요.
전문가와 바로 연결하실 수 있습니다:

  📞 자살예방상담전화        109        (24시간, 무료)
  📞 정신건강 위기상담전화  1577-0199  (24시간, 무료)
  📞 생명의전화              1588-9191  (24시간, 무료)

지금 바로 전화해 주세요. 당신의 이야기를 들어드릴 분이 기다리고 있습니다.`;

export function checkCrisis(text: string): boolean {
  return CRISIS_KEYWORDS.some(kw => text.includes(kw));
}

export function isAmbiguous(text: string): boolean {
  return AMBIGUOUS_PATTERNS.some(p => text.includes(p));
}

export function detectContradiction(history: { role: string; content: string }[]): boolean {
  const recent = history.slice(-6).filter(m => m.role === "user").map(m => m.content);
  const combined = recent.join(" ");
  return CONTRADICTION_PAIRS.some(([a, b]) => combined.includes(a) && combined.includes(b));
}
