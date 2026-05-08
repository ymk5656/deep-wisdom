"use client";

import { useRef, useState } from "react";

interface Props {
  onClose: () => void;
}

export default function ExpertPanel({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function search() {
    if (!query.trim() || busy) return;
    setBusy(true);
    setResult("");

    const res = await fetch("/api/expert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        full += JSON.parse(data);
        setResult(full);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    setBusy(false);
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-40 flex flex-col justify-end md:justify-center md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-50 bg-white w-full md:w-[600px] md:max-h-[80vh] rounded-t-2xl md:rounded-2xl flex flex-col shadow-xl max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-gray-800">🔬 전문가 자료 검색</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">✕</button>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="예: depression CBT, 불안장애 치료법..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={search}
            disabled={busy || !query.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {busy ? "검색 중…" : "검색"}
          </button>
        </div>

        {/* Result */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!result && !busy && (
            <p className="text-sm text-gray-400 text-center mt-8">
              임상심리·상담 관련 근거 기반 전문 정보를 검색합니다.
            </p>
          )}
          {result && (
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {result}
              {busy && <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
