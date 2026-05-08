"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import MessageBubble from "@/components/MessageBubble";
import VoiceButton from "@/components/VoiceButton";
import ExpertPanel from "@/components/ExpertPanel";

const STATE_LABELS: Record<string, string> = {
  INIT: "시작", RAPPORT: "신뢰 형성", EXPLORATION: "탐색",
  DEEPENING: "심화", INSIGHT: "통찰", CLOSING: "마무리", CRISIS: "위기 대응",
};

interface Message { role: "user" | "assistant"; content: string; streaming?: boolean; }

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("INIT");
  const [showExpert, setShowExpert] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then(r => r.json())
      .then(({ session, messages: msgs }) => {
        setState(session.state);
        setMessages(msgs.map((m: Message) => ({ role: m.role, content: m.content })));
        if (msgs.length === 0) {
          setMessages([{
            role: "assistant",
            content: "안녕하세요. 편하게 이야기해 주세요. 어떤 이야기든 들어드리겠습니다.",
          }]);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function playTts(text: string) {
    try {
      let clean = text
        .replace(/^\[[^\]]+\]\s*/gu, "")
        .replace(/\buser\b/gi, "유세스")
        .replace(/\bfeedback\b/gi, "피드백")
        .trim();
      if (!clean) return;
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
    } catch { /* TTS optional */ }
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          const chunk: string = JSON.parse(data);
          if (chunk.startsWith("\x00SYS:")) continue;
          full += chunk;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: full, streaming: true };
            return next;
          });
        }
      }
    } finally {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: full, streaming: false };
        return next;
      });
      fetch(`/api/session/${sessionId}`)
        .then(r => r.json())
        .then(({ session }) => setState(session.state))
        .catch(() => {});
      setBusy(false);
      if (full) playTts(full);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">상담 세션 #{sessionId}</h2>
          <p className="text-xs text-gray-500">{STATE_LABELS[state] ?? state}</p>
        </div>
        <button
          onClick={() => setShowExpert(true)}
          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          🔬 전문가 검색
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} streaming={m.streaming} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-200 p-3 shrink-0">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <VoiceButton onTranscript={t => setInput(t)} disabled={busy} />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            placeholder="메시지를 입력하세요…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white flex items-center justify-center shrink-0 transition-colors text-xl"
          >
            ↑
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          이 앱은 전문 임상 상담을 대체하지 않습니다. 위기 상황 시 ☎ 109
        </p>
      </div>

      {/* Expert panel */}
      {showExpert && <ExpertPanel onClose={() => setShowExpert(false)} />}
    </div>
  );
}
