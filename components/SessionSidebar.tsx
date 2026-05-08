"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const STATE_LABELS: Record<string, string> = {
  INIT: "시작", RAPPORT: "신뢰 형성", EXPLORATION: "탐색",
  DEEPENING: "심화", INSIGHT: "통찰", CLOSING: "마무리", CRISIS: "위기",
};

interface Session { session_id: string; state: string; updated_at: string; }

interface Props {
  onNewSession: () => void;
  onClose: () => void;
  creating: boolean;
}

export default function SessionSidebar({ onNewSession, onClose, creating }: Props) {
  const router = useRouter();
  const params = useParams<{ sessionId?: string }>();
  const activeId = params?.sessionId;
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    fetch("/api/session").then(r => r.json()).then(setSessions).catch(() => {});
  }, [activeId]);

  function goTo(id: string) {
    router.push(`/chat/${id}`);
    onClose();
  }

  return (
    <aside className="w-72 md:w-60 shrink-0 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-sm tracking-wide text-gray-300">DEEP WISDOM</h1>
          <p className="text-xs text-gray-500 mt-0.5">인간 중심 상담 AI</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-white text-xl leading-none p-1"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <button
        onClick={onNewSession}
        disabled={creating}
        className="mx-3 mt-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {creating ? "생성 중…" : "+ 새 세션 시작"}
      </button>

      <div className="flex-1 overflow-y-auto mt-3 px-2 space-y-1 pb-4">
        {sessions.map(s => (
          <button
            key={s.session_id}
            onClick={() => goTo(s.session_id)}
            className={`w-full text-left rounded-lg px-3 py-2.5 text-xs transition-colors ${
              s.session_id === activeId
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <div className="font-mono text-gray-500">#{s.session_id}</div>
            <div className="flex justify-between mt-0.5">
              <span>{STATE_LABELS[s.state] ?? s.state}</span>
              <span className="text-gray-600">{s.updated_at.slice(5, 16)}</span>
            </div>
          </button>
        ))}
        {sessions.length === 0 && (
          <p className="text-xs text-gray-600 px-3 py-4">세션이 없습니다.</p>
        )}
      </div>
    </aside>
  );
}
